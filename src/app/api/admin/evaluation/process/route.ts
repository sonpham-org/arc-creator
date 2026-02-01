import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { getServerApiKey, PROVIDER_RATE_LIMITS, type LLMProvider } from '@/lib/llm';
import { canMakeRequest, consumeRequest, applyBackoff } from '@/lib/rateLimiter';
import { executeModelRun } from '@/lib/modelRunner';

/**
 * POST /api/admin/evaluation/process
 *
 * Processes a batch of queued evaluation jobs, respecting rate limits.
 * Designed to be called by an external cron or manually by admin.
 *
 * Body: { adminKey: string, batchSize?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, batchSize = 20 } = body;

    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queued jobs, ordered by priority (1 first) then creation time
    const jobs = await prisma.evaluationJob.findMany({
      where: {
        status: 'queued',
        attempts: { lt: 3 }, // prisma uses the field directly, maxAttempts check below
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
      take: batchSize * 3, // fetch extra since some may be rate-limited
    });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      rateLimited: 0,
      skipped: 0,
    };

    let processed = 0;

    for (const job of jobs) {
      if (processed >= batchSize) break;

      const providerModel = `${job.provider}:${job.model}`;
      const limits = PROVIDER_RATE_LIMITS[providerModel];

      if (!limits) {
        // Unknown model limits, skip
        results.skipped++;
        continue;
      }

      // Check rate limit
      if (!canMakeRequest(providerModel, limits)) {
        results.rateLimited++;
        continue;
      }

      // Get API key
      const apiKey = getServerApiKey(job.provider as LLMProvider);
      if (!apiKey) {
        await prisma.evaluationJob.update({
          where: { id: job.id },
          data: { status: 'skipped', lastError: `No API key for provider: ${job.provider}` },
        });
        results.skipped++;
        continue;
      }

      // Get the generation with pairs
      const generation = await prisma.generation.findUnique({
        where: { id: job.generationId },
        include: { pairs: { orderBy: { order: 'asc' } } },
      });

      if (!generation || generation.pairs.filter(p => p.isTestCase).length === 0) {
        await prisma.evaluationJob.update({
          where: { id: job.id },
          data: { status: 'skipped', lastError: 'No test cases found' },
        });
        results.skipped++;
        continue;
      }

      // Consume rate limit token
      consumeRequest(providerModel, limits);

      // Mark job as running
      await prisma.evaluationJob.update({
        where: { id: job.id },
        data: { status: 'running', attempts: { increment: 1 } },
      });

      try {
        // Create a ModelRun record
        const modelRun = await prisma.modelRun.create({
          data: {
            generationId: job.generationId,
            modelName: job.model,
            provider: job.provider,
            status: 'running',
            metadata: { temperature: 0.3, maxTokens: 4000, source: 'auto-eval' },
          },
        });

        // Execute it
        const modelRunWithGen = {
          ...modelRun,
          generation: { pairs: generation.pairs },
        };
        await executeModelRun(modelRunWithGen, apiKey);

        // Mark evaluation job as completed
        await prisma.evaluationJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            modelRunId: modelRun.id,
            completedAt: new Date(),
          },
        });

        results.succeeded++;
      } catch (error: any) {
        const is429 = error.message?.includes('429') || error.message?.includes('rate');

        if (is429) {
          applyBackoff(providerModel, job.attempts + 1);
          // Re-queue (set back to queued so it retries)
          await prisma.evaluationJob.update({
            where: { id: job.id },
            data: { status: 'queued', lastError: error.message },
          });
          results.rateLimited++;
        } else if (job.attempts + 1 >= job.maxAttempts) {
          await prisma.evaluationJob.update({
            where: { id: job.id },
            data: { status: 'failed', lastError: error.message },
          });
          results.failed++;
        } else {
          // Re-queue for retry
          await prisma.evaluationJob.update({
            where: { id: job.id },
            data: { status: 'queued', lastError: error.message },
          });
          results.failed++;
        }
      }

      processed++;
      results.processed++;
    }

    return NextResponse.json({
      message: `Processed ${results.processed} jobs`,
      ...results,
      remainingQueued: await prisma.evaluationJob.count({ where: { status: 'queued' } }),
    });
  } catch (error: any) {
    console.error('Error processing evaluation batch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process evaluations' },
      { status: 500 }
    );
  }
}
