import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from './prisma';

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
    const prompt = buildARCPrompt(trainingPairs, testPairs);

    // Call the model based on provider
    let reasoning = '';
    let predictions: any[] = [];
    
    if (modelRun.provider === 'anthropic') {
      const result = await callAnthropic(
        apiKey,
        modelRun.modelName,
        prompt,
        modelRun.metadata
      );
      reasoning = result.reasoning;
      predictions = result.predictions;
      totalTokens = result.tokensUsed;
    } else if (modelRun.provider === 'openai') {
      const result = await callOpenAI(
        apiKey,
        modelRun.modelName,
        prompt,
        modelRun.metadata
      );
      reasoning = result.reasoning;
      predictions = result.predictions;
      totalTokens = result.tokensUsed;
    } else {
      throw new Error(`Unsupported provider: ${modelRun.provider}`);
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

    return { success: true };
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

function buildARCPrompt(
  trainingPairs: any[],
  testPairs: any[]
): string {
  let prompt = `You are an expert at solving ARC (Abstraction and Reasoning Corpus) puzzles. These puzzles involve finding patterns in grids of colored cells.

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

## Training Examples:

`;

  trainingPairs.forEach((pair, idx) => {
    prompt += `### Example ${idx + 1}:\n`;
    prompt += `Input:\n${JSON.stringify(pair.input, null, 2)}\n\n`;
    prompt += `Output:\n${JSON.stringify(pair.output, null, 2)}\n\n`;
  });

  prompt += `## Test Cases:

Now apply the pattern you discovered to solve these test inputs:

`;

  testPairs.forEach((pair, idx) => {
    prompt += `### Test ${idx + 1}:\n`;
    prompt += `Input:\n${JSON.stringify(pair.input, null, 2)}\n\n`;
  });

  prompt += `Please respond with a JSON object in the following format:
{
  "reasoning": "Your detailed explanation of the pattern you discovered and how you applied it",
  "predictions": [
    [[output grid for test 1]],
    [[output grid for test 2]],
    ...
  ]
}

Make sure your predictions array contains exactly ${testPairs.length} grid(s).`;

  return prompt;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  metadata: any
) {
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model,
    max_tokens: metadata.maxTokens || 4000,
    temperature: metadata.temperature || 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  // Parse the JSON response
  const result = parseModelResponse(content.text);

  return {
    reasoning: result.reasoning,
    predictions: result.predictions,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  metadata: any
) {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: metadata.temperature || 0.7,
    max_tokens: metadata.maxTokens || 4000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  // Parse the JSON response
  const result = parseModelResponse(content);

  return {
    reasoning: result.reasoning,
    predictions: result.predictions,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

function parseModelResponse(text: string): {
  reasoning: string;
  predictions: any[];
} {
  // Try to extract JSON from markdown code blocks if present
  let jsonText = text.trim();
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonText);
  
  if (!parsed.reasoning || !Array.isArray(parsed.predictions)) {
    throw new Error('Invalid response format: missing reasoning or predictions');
  }

  return {
    reasoning: parsed.reasoning,
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
