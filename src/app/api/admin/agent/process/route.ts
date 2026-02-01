import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { callLLM, getServerApiKey, PROVIDER_RATE_LIMITS, type LLMProvider } from '@/lib/llm';
import { canMakeRequest, consumeRequest, applyBackoff, getRateLimitStatus } from '@/lib/rateLimiter';
import { generatePuzzleId } from '@/lib/puzzleId';

/**
 * POST /api/admin/agent/process
 *
 * Processes pending Jobs by generating puzzles using free LLMs.
 * Round-robins across providers, respects rate limits.
 * Tags each created puzzle with "agent".
 *
 * Body: { adminKey: string, batchSize?: number }
 */

const GENERATION_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'gemini', model: 'gemini-2.0-flash' },
  { provider: 'mistral', model: 'mistral-large-latest' },
  { provider: 'cerebras', model: 'llama-3.3-70b' },
];

const SYSTEM_PROMPT = `You are an ARC puzzle creator. Generate a challenge with 5 input/output pairs based on a concept. Output strictly JSON with "pairs": [{"input": [[]], "output": [[]]}] and "explanation": "string". Pairs must be exactly 5. Colors 0-9. Max grid 30x30.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, batchSize = 10 } = body;

    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending jobs
    const pendingJobs = await prisma.job.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: batchSize * 3, // Fetch extra since some may be rate-limited
    });

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        message: 'No pending jobs to process',
        processed: 0,
      });
    }

    // Filter models to those with available API keys
    const availableModels = GENERATION_MODELS.filter(
      m => getServerApiKey(m.provider) !== null
    );

    if (availableModels.length === 0) {
      return NextResponse.json(
        { error: 'No API keys configured for any generation model' },
        { status: 400 }
      );
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      rateLimited: 0,
      duplicates: 0,
    };

    let modelIndex = 0;
    let processed = 0;

    for (const job of pendingJobs) {
      if (processed >= batchSize) break;

      // Find an available model (round-robin, skip rate-limited ones)
      let selectedModel: typeof availableModels[0] | null = null;
      let apiKey: string | null = null;
      for (let attempts = 0; attempts < availableModels.length; attempts++) {
        const candidate = availableModels[modelIndex % availableModels.length];
        modelIndex++;

        const providerModel = `${candidate.provider}:${candidate.model}`;
        const limits = PROVIDER_RATE_LIMITS[providerModel];

        if (!limits || !canMakeRequest(providerModel, limits)) {
          continue;
        }

        const key = getServerApiKey(candidate.provider);
        if (key) {
          selectedModel = candidate;
          apiKey = key;
          consumeRequest(providerModel, limits);
          break;
        }
      }

      if (!selectedModel || !apiKey) {
        results.rateLimited++;
        continue;
      }

      // Mark job as running
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'running', model: `${selectedModel.provider}/${selectedModel.model}` },
      });

      const startTime = Date.now();
      let rawLlmContent = '';

      try {
        const userPrompt = `Concept: ${job.concept}`;

        const { content: llmContent, tokensUsed } = await callLLM(
          selectedModel.provider,
          apiKey,
          SYSTEM_PROMPT,
          userPrompt,
          selectedModel.model,
        );

        rawLlmContent = llmContent;
        const timeTakenMs = Date.now() - startTime;

        // Parse response
        let content;
        try {
          let text = llmContent.trim();
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (fenceMatch) text = fenceMatch[1];
          content = JSON.parse(text);
        } catch {
          throw new Error('Failed to parse LLM response as JSON');
        }

        if (!Array.isArray(content.pairs) || content.pairs.length < 3) {
          throw new Error(`Invalid puzzle: got ${content.pairs?.length || 0} pairs (need at least 3)`);
        }

        // Generate content-based ID
        const pairsWithOrder = content.pairs.map((p: any, i: number) => ({
          input: p.input,
          output: p.output,
          order: i,
        }));
        const puzzleId = generatePuzzleId(pairsWithOrder);

        // Check for duplicates
        const existing = await prisma.puzzle.findUnique({ where: { id: puzzleId } });
        if (existing) {
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              puzzleId,
              tokensUsed,
              timeTakenMs,
            },
          });
          results.duplicates++;
          results.succeeded++;
          processed++;
          results.processed++;
          continue;
        }

        // Create puzzle with "agent" tag
        const totalPairs = content.pairs.length;
        const numTestCases = Math.min(2, Math.floor(totalPairs * 0.4));

        await prisma.$transaction(async (tx) => {
          await tx.puzzle.create({
            data: {
              id: puzzleId,
              idea: job.concept,
              source: 'generated',
              tags: ['agent'],
              jobId: job.id,
            },
          });

          await tx.generation.create({
            data: {
              puzzleId,
              tokensUsed,
              timeTakenMs,
              reasoning: content.explanation || '',
              pairs: {
                create: content.pairs.map((p: any, i: number) => ({
                  input: p.input,
                  output: p.output,
                  order: i,
                  isTestCase: i >= totalPairs - numTestCases,
                })),
              },
            },
          });

          await tx.job.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              puzzleId,
              tokensUsed,
              timeTakenMs,
            },
          });
        });

        results.succeeded++;
      } catch (error: any) {
        const is429 = error.message?.includes('429') || error.message?.includes('rate');
        const providerModel = `${selectedModel.provider}:${selectedModel.model}`;

        if (is429) {
          applyBackoff(providerModel, 1);
          // Re-queue
          await prisma.job.update({
            where: { id: job.id },
            data: { status: 'pending', errorMessage: error.message },
          });
          results.rateLimited++;
        } else {
          await prisma.job.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              errorMessage: error.message,
              content: rawLlmContent || null, // Store raw LLM output for debugging
              timeTakenMs: Date.now() - startTime,
            },
          });
          results.failed++;
        }
      }

      processed++;
      results.processed++;
    }

    const remainingPending = await prisma.job.count({ where: { status: 'pending' } });

    return NextResponse.json({
      message: `Processed ${results.processed} jobs: ${results.succeeded} succeeded, ${results.failed} failed, ${results.rateLimited} rate-limited`,
      ...results,
      remainingPending,
      rateLimits: getRateLimitStatus(),
    });
  } catch (error: any) {
    console.error('Error processing agent jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process agent jobs' },
      { status: 500 }
    );
  }
}
