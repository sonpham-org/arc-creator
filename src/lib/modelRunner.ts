import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';
import { callLLM, getServerApiKey, type LLMProvider } from './llm';

interface ModelRunWithGeneration {
  id: string;
  generationId: string;
  modelName: string;
  provider: string;
  metadata: any;
  generation: {
    pairs: Array<{
      id: string;
      input: any;
      output: any;
      isTestCase: boolean;
      order: number;
    }>;
  };
}

export async function executeModelRun(
  modelRun: ModelRunWithGeneration,
  apiKey: string
) {
  const startTime = Date.now();
  let totalTokens = 0;

  try {
    // Separate training and test pairs
    const trainingPairs = modelRun.generation.pairs.filter(p => !p.isTestCase);
    const testPairs = modelRun.generation.pairs.filter(p => p.isTestCase);

    if (testPairs.length === 0) {
      throw new Error('No test cases found for this generation');
    }

    // Build the prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(trainingPairs, testPairs);

    let reasoning = '';
    let predictions: any[] = [];

    const provider = modelRun.provider as LLMProvider;

    // Use Anthropic SDK directly for anthropic (needs special handling for max_tokens)
    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: modelRun.modelName,
        max_tokens: modelRun.metadata?.maxTokens || 4000,
        temperature: modelRun.metadata?.temperature || 0.7,
        messages: [{ role: 'user', content: systemPrompt + '\n\n' + userPrompt }],
      });
      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type from Anthropic');
      const result = parseModelResponse(content.text);
      reasoning = result.reasoning;
      predictions = result.predictions;
      totalTokens = response.usage.input_tokens + response.usage.output_tokens;
    } else {
      // All other providers go through unified callLLM
      const result = await callLLM(provider, apiKey, systemPrompt, userPrompt, modelRun.modelName);
      const parsed = parseModelResponse(result.content);
      reasoning = parsed.reasoning;
      predictions = parsed.predictions;
      totalTokens = result.tokensUsed;
    }

    // Validate predictions
    if (predictions.length !== testPairs.length) {
      throw new Error(
        `Expected ${testPairs.length} predictions, got ${predictions.length}`
      );
    }

    // Score predictions and create ModelPrediction records
    let correctCount = 0;
    const predictionRecords = testPairs.map((testPair, idx) => {
      const predicted = predictions[idx];
      const isCorrect = gridsEqual(predicted, testPair.output);

      if (isCorrect) correctCount++;

      return {
        runId: modelRun.id,
        pairId: testPair.id,
        predicted,
        expected: testPair.output,
        isCorrect,
      };
    });

    // Update the model run with results
    const accuracy = correctCount / testPairs.length;
    const timeTakenMs = Date.now() - startTime;

    await prisma.$transaction([
      // Create all predictions
      ...predictionRecords.map(pred =>
        prisma.modelPrediction.create({ data: pred })
      ),
      // Update the run
      prisma.modelRun.update({
        where: { id: modelRun.id },
        data: {
          status: 'completed',
          reasoning,
          correctCount,
          totalCount: testPairs.length,
          accuracy,
          tokensUsed: totalTokens,
          timeTakenMs,
        },
      }),
    ]);

    return { success: true, accuracy };
  } catch (error: any) {
    // Update run as failed
    await prisma.modelRun.update({
      where: { id: modelRun.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        timeTakenMs: Date.now() - startTime,
      },
    });

    throw error;
  }
}

function buildSystemPrompt(): string {
  return `You are an expert at solving ARC (Abstraction and Reasoning Corpus) puzzles. These puzzles involve finding patterns in grids of colored cells.

Each grid is represented as a 2D array where each cell contains a number from 0-9, representing different colors:
- 0: black (background)
- 1: blue
- 2: red
- 3: green
- 4: yellow
- 5: gray
- 6: pink
- 7: orange
- 8: cyan
- 9: brown

You will be given several training examples showing input-output pairs. Your task is to:
1. Analyze the pattern that transforms inputs to outputs
2. Apply that pattern to solve test inputs

Respond with ONLY a JSON object in this format:
{
  "reasoning": "Your explanation of the pattern",
  "predictions": [[[output grid for test 1]], ...]
}`;
}

function buildUserPrompt(
  trainingPairs: any[],
  testPairs: any[]
): string {
  let prompt = '## Training Examples:\n\n';

  trainingPairs.forEach((pair, idx) => {
    prompt += `### Example ${idx + 1}:\n`;
    prompt += `Input:\n${JSON.stringify(pair.input)}\n\n`;
    prompt += `Output:\n${JSON.stringify(pair.output)}\n\n`;
  });

  prompt += `## Test Cases:\n\n`;

  testPairs.forEach((pair, idx) => {
    prompt += `### Test ${idx + 1}:\n`;
    prompt += `Input:\n${JSON.stringify(pair.input)}\n\n`;
  });

  prompt += `Respond with a JSON object containing "reasoning" and "predictions" (array of ${testPairs.length} grid(s)).`;

  return prompt;
}

export function parseModelResponse(text: string): {
  reasoning: string;
  predictions: any[];
} {
  // Try to extract JSON from markdown code blocks if present
  let jsonText = text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  // Also try to find a JSON object if the model wrapped it in other text
  if (!jsonText.startsWith('{')) {
    const objMatch = jsonText.match(/\{[\s\S]*"predictions"[\s\S]*\}/);
    if (objMatch) {
      jsonText = objMatch[0];
    }
  }

  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed.predictions)) {
    throw new Error('Invalid response format: missing predictions array');
  }

  return {
    reasoning: parsed.reasoning || '',
    predictions: parsed.predictions,
  };
}

function gridsEqual(grid1: any, grid2: any): boolean {
  if (!Array.isArray(grid1) || !Array.isArray(grid2)) return false;
  if (grid1.length !== grid2.length) return false;

  for (let i = 0; i < grid1.length; i++) {
    if (!Array.isArray(grid1[i]) || !Array.isArray(grid2[i])) return false;
    if (grid1[i].length !== grid2[i].length) return false;

    for (let j = 0; j < grid1[i].length; j++) {
      if (grid1[i][j] !== grid2[i][j]) return false;
    }
  }

  return true;
}
