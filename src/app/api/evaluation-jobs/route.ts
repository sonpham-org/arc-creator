import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/evaluation-jobs - List evaluation/solving jobs
 * Query params: status (optional), limit (default 200)
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const jobs = await prisma.evaluationJob.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // running first, then queued, then completed
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error('Error fetching evaluation jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation jobs' },
      { status: 500 }
    );
  }
}
