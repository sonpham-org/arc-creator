import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { getServerApiKey, type LLMProvider } from '@/lib/llm';

/**
 * POST /api/admin/evaluation/smart-enqueue
 *
 * Smart job that analyzes existing evaluation coverage and queues what's missing.
 *
 * Strategy:
 * 1. Prioritize puzzles by tag: ARC-AGI 2024 → ARC-AGI 2025 → everything else
 * 2. For each puzzle, check which models have already been evaluated
 * 3. Queue cheap models first (priority 1)
 * 4. Queue expensive models only for puzzles where all cheap models scored 0% (priority 2)
 * 5. Never re-queue completed or already-queued combos
 *
 * Body: {
 *   adminKey: string,
 *   maxToQueue?: number,        // default 500
 *   tags?: string[],            // filter to specific tags (default: all, sorted by priority)
 *   onlyPriority?: 1 | 2,      // only queue this priority level
 * }
 */

// Tag priority order - lower index = higher priority
const TAG_PRIORITY = [
  'ARC-AGI 2024',
  'ARC-AGI 2025',
  'ConceptARC',
  'training',
  'evaluation',
  'Community',
];

const CHEAP_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'gemini', model: 'gemini-2.0-flash' },
];

const EXPENSIVE_MODELS: { provider: LLMProvider; model: string }[] = [
  { provider: 'mistral', model: 'mistral-large-latest' },
  { provider: 'cerebras', model: 'llama-3.3-70b' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
];

function getTagPriority(tags: string[]): number {
  for (let i = 0; i < TAG_PRIORITY.length; i++) {
    if (tags.includes(TAG_PRIORITY[i])) return i;
  }
  return TAG_PRIORITY.length; // lowest priority for unrecognized tags
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, maxToQueue = 500, tags, onlyPriority } = body;

    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Filter to only models with available API keys
    const availableCheap = CHEAP_MODELS.filter(m => getServerApiKey(m.provider));
    const availableExpensive = EXPENSIVE_MODELS.filter(m => getServerApiKey(m.provider));

    if (availableCheap.length === 0 && availableExpensive.length === 0) {
      return NextResponse.json(
        { error: 'No API keys configured for any evaluation models' },
        { status: 400 }
      );
    }

    // Build puzzle filter
    const puzzleWhere: any = {};
    if (tags && Array.isArray(tags) && tags.length > 0) {
      puzzleWhere.tags = { hasSome: tags };
    }

    // Get all generations with test cases, include puzzle tags for sorting
    const generations = await prisma.generation.findMany({
      where: {
        pairs: { some: { isTestCase: true } },
        puzzle: puzzleWhere,
      },
      select: {
        id: true,
        puzzleId: true,
        puzzle: { select: { tags: true } },
      },
    });

    // Sort by tag priority: ARC-AGI 2024 first, then 2025, then others
    generations.sort((a, b) => {
      return getTagPriority(a.puzzle.tags) - getTagPriority(b.puzzle.tags);
    });

    // Get all existing evaluation jobs and completed model runs
    const [existingJobs, existingRuns] = await Promise.all([
      prisma.evaluationJob.findMany({
        where: { status: { in: ['queued', 'running', 'completed'] } },
        select: { generationId: true, provider: true, model: true },
      }),
      prisma.modelRun.findMany({
        where: { status: 'completed' },
        select: { generationId: true, provider: true, modelName: true, accuracy: true },
      }),
    ]);

    // Build lookup sets
    const jobKey = (genId: string, provider: string, model: string) =>
      `${genId}:${provider}:${model}`;

    const existingSet = new Set([
      ...existingJobs.map(j => jobKey(j.generationId, j.provider, j.model)),
      ...existingRuns.map(r => jobKey(r.generationId, r.provider, r.modelName)),
    ]);

    // Build per-generation accuracy map (best accuracy from any model)
    const genAccuracy = new Map<string, number>();
    for (const run of existingRuns) {
      const current = genAccuracy.get(run.generationId) ?? -1;
      if ((run.accuracy ?? 0) > current) {
        genAccuracy.set(run.generationId, run.accuracy ?? 0);
      }
    }

    // Count of cheap model evaluations per generation
    const cheapModelKeys = new Set(
      availableCheap.map(m => `${m.provider}:${m.model}`)
    );
    const genCheapEvals = new Map<string, number>();
    for (const run of existingRuns) {
      const mk = `${run.provider}:${run.modelName}`;
      if (cheapModelKeys.has(mk)) {
        genCheapEvals.set(run.generationId, (genCheapEvals.get(run.generationId) ?? 0) + 1);
      }
    }

    let queued = 0;
    let skippedExisting = 0;
    const tagBreakdown: Record<string, number> = {};

    const toCreate: { puzzleId: string; generationId: string; provider: string; model: string; priority: number }[] = [];

    for (const gen of generations) {
      if (queued >= maxToQueue) break;

      const bestAccuracy = genAccuracy.get(gen.id) ?? -1;
      const cheapEvalCount = genCheapEvals.get(gen.id) ?? 0;
      const primaryTag = gen.puzzle.tags[0] || 'untagged';

      // Priority 1: Queue cheap models for generations with no/few evaluations
      if ((!onlyPriority || onlyPriority === 1) && cheapEvalCount < availableCheap.length) {
        for (const model of availableCheap) {
          if (queued >= maxToQueue) break;
          const key = jobKey(gen.id, model.provider, model.model);
          if (existingSet.has(key)) {
            skippedExisting++;
            continue;
          }
          toCreate.push({
            puzzleId: gen.puzzleId,
            generationId: gen.id,
            provider: model.provider,
            model: model.model,
            priority: 1,
          });
          existingSet.add(key);
          tagBreakdown[primaryTag] = (tagBreakdown[primaryTag] || 0) + 1;
          queued++;
        }
      }

      // Priority 2: Queue expensive models only if ALL cheap models scored 0%
      if ((!onlyPriority || onlyPriority === 2) && cheapEvalCount >= availableCheap.length && bestAccuracy === 0) {
        for (const model of availableExpensive) {
          if (queued >= maxToQueue) break;
          const key = jobKey(gen.id, model.provider, model.model);
          if (existingSet.has(key)) {
            skippedExisting++;
            continue;
          }
          toCreate.push({
            puzzleId: gen.puzzleId,
            generationId: gen.id,
            provider: model.provider,
            model: model.model,
            priority: 2,
          });
          existingSet.add(key);
          tagBreakdown[primaryTag] = (tagBreakdown[primaryTag] || 0) + 1;
          queued++;
        }
      }
    }

    // Batch create
    if (toCreate.length > 0) {
      await prisma.evaluationJob.createMany({
        data: toCreate.map(j => ({
          puzzleId: j.puzzleId,
          generationId: j.generationId,
          provider: j.provider,
          model: j.model,
          priority: j.priority,
          status: 'queued',
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: `Smart enqueue complete`,
      queued,
      skippedExisting,
      totalGenerationsConsidered: generations.length,
      tagBreakdown,
      availableProviders: {
        cheap: availableCheap.map(m => `${m.provider}/${m.model}`),
        expensive: availableExpensive.map(m => `${m.provider}/${m.model}`),
      },
      strategy: {
        order: 'ARC-AGI 2024 → ARC-AGI 2025 → ConceptARC → training → evaluation → Community → rest',
        priority1: 'Cheap models for generations with missing evaluations',
        priority2: 'Expensive models for generations where all cheap models scored 0%',
      },
    });
  } catch (error: any) {
    console.error('Error in smart enqueue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to smart enqueue' },
      { status: 500 }
    );
  }
}
