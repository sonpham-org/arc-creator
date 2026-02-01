import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { getRateLimitStatus } from '@/lib/rateLimiter';
import { getServerApiKey, type LLMProvider } from '@/lib/llm';

/**
 * GET /api/admin/evaluation/status?adminKey=xxx
 *
 * Returns queue statistics and rate limit status.
 */
export async function GET(req: NextRequest) {
  try {
    const adminKey = req.nextUrl.searchParams.get('adminKey');

    if (!adminKey || !verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [queueStats, providerCoverage, totalPuzzles] = await Promise.all([
      prisma.evaluationJob.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.evaluationJob.groupBy({
        by: ['provider', 'model', 'status'],
        _count: true,
      }),
      prisma.generation.count({
        where: { pairs: { some: { isTestCase: true } } },
      }),
    ]);

    // Check which providers have keys configured
    const providers: LLMProvider[] = ['gemini', 'groq', 'mistral', 'cerebras', 'openrouter'];
    const configuredProviders = providers.filter(p => getServerApiKey(p) !== null);

    return NextResponse.json({
      queue: Object.fromEntries(
        queueStats.map(s => [s.status, s._count])
      ),
      providerBreakdown: providerCoverage.map(p => ({
        provider: p.provider,
        model: p.model,
        status: p.status,
        count: p._count,
      })),
      totalEligibleGenerations: totalPuzzles,
      configuredProviders,
      rateLimits: getRateLimitStatus(),
    });
  } catch (error: any) {
    console.error('Error fetching evaluation status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
