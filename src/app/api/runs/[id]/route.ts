import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/runs/:id - Get a specific model run with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const run = await prisma.modelRun.findUnique({
      where: { id },
      include: {
        predictions: {
          include: {
            pair: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        generation: {
          include: {
            pairs: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Model run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Error fetching model run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model run' },
      { status: 500 }
    );
  }
}
