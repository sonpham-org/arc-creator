import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeModelRun } from '@/lib/modelRunner';

// POST /api/runs/:id/execute - Execute a pending model run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'apiKey is required' },
        { status: 400 }
      );
    }

    // Get the model run
    const modelRun = await prisma.modelRun.findUnique({
      where: { id },
      include: {
        generation: {
          include: {
            pairs: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!modelRun) {
      return NextResponse.json(
        { error: 'Model run not found' },
        { status: 404 }
      );
    }

    if (modelRun.status !== 'pending') {
      return NextResponse.json(
        { error: 'Model run is not in pending status' },
        { status: 400 }
      );
    }

    // Update status to running
    await prisma.modelRun.update({
      where: { id },
      data: { status: 'running' },
    });

    // Execute the run (this will update the database when complete)
    executeModelRun(modelRun, apiKey).catch(async (error: any) => {
      console.error('Error executing model run:', error);
      await prisma.modelRun.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
    });

    return NextResponse.json({ message: 'Model run started' });
  } catch (error) {
    console.error('Error starting model run:', error);
    return NextResponse.json(
      { error: 'Failed to start model run' },
      { status: 500 }
    );
  }
}
