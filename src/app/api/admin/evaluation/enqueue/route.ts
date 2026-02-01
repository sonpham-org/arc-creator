import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { PROVIDER_RATE_LIMITS, getServerApiKey, type LLMProvider } from '@/lib/llm';

/**
 * POST /api/admin/evaluation/enqueue
 *
 * Queues unevaluated puzzle+model combinations for batch processing.
 * Only queues combos where a server-side API key is available.
 *
 * Body: { adminKey: string, priority?: 1|2, providers?: string[] }
 *
 * Priority 1 (default): cheap/fast models for first pass
 * Priority 2: expensive models for puzzles that failed first pass
 */

// Models to evaluate, grouped by priority
const PRIORITY_1_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'gemini', model: 'gemini-2.0-flash' },
];

const PRIORITY_2_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: 'mistral', model: 'mistral-large-latest' },
  { provider: 'cerebras', model: 'llama-3.3-70b' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, priority, providers } = body;

    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine which models to queue
    let modelsToQueue = [
      ...PRIORITY_1_MODELS.map(m => ({ ...m, priority: 1 })),
      ...PRIORITY_2_MODELS.map(m => ({ ...m, priority: 2 })),
    ];

    // Filter by priority if specified
    if (priority) {
      modelsToQueue = modelsToQueue.filter(m => m.priority === priority);
    }

    // Filter by providers if specified
    if (providers && Array.isArray(providers)) {
      modelsToQueue = modelsToQueue.filter(m => providers.includes(m.provider));
    }

    // Only include models where we have a server-side API key
    modelsToQueue = modelsToQueue.filter(m => getServerApiKey(m.provider) !== null);

    if (modelsToQueue.length === 0) {
      return NextResponse.json(
        { error: 'No models available - no API keys configured for the selected providers' },
        { status: 400 }
      );
    }

    // Get all generations (latest per puzzle) that have test cases
    const generations = await prisma.generation.findMany({
      where: {
        pairs: { some: { isTestCase: true } },
      },
      select: {
        id: true,
        puzzleId: true,
      },
    });

    let queued = 0;
    let skipped = 0;

    for (const gen of generations) {
      for (const modelConfig of modelsToQueue) {
        try {
          await prisma.evaluationJob.create({
            data: {
              puzzleId: gen.puzzleId,
              generationId: gen.id,
              provider: modelConfig.provider,
              model: modelConfig.model,
              priority: modelConfig.priority,
              status: 'queued',
            },
          });
          queued++;
        } catch (e: any) {
          // Unique constraint violation = already queued, skip
          if (e.code === 'P2002') {
            skipped++;
          } else {
            throw e;
          }
        }
      }
    }

    return NextResponse.json({
      message: `Enqueued ${queued} evaluation jobs, skipped ${skipped} (already queued)`,
      queued,
      skipped,
      totalGenerations: generations.length,
      modelsPerGeneration: modelsToQueue.length,
    });
  } catch (error: any) {
    console.error('Error enqueueing evaluations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue evaluations' },
      { status: 500 }
    );
  }
}
