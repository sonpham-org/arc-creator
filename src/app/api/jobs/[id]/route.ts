import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/jobs/:id - Get job details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        puzzles: {
          include: {
            generations: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Error fetching job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/jobs/:id - Update job status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, puzzleId, errorMessage, tokensUsed, timeTakenMs } = await req.json();

    const job = await prisma.job.update({
      where: { id },
      data: {
        status,
        puzzleId,
        errorMessage,
        tokensUsed,
        timeTakenMs,
      },
    });

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Error updating job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
