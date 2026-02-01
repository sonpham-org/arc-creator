import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/generations/:id/runs - Get all model runs for a generation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const runs = await prisma.modelRun.findMany({
      where: { generationId: id },
      include: {
        predictions: {
          include: {
            pair: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Error fetching model runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model runs' },
      { status: 500 }
    );
  }
}

// POST /api/generations/:id/runs - Create a new model run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { modelName, provider, apiKey, temperature = 0.7, maxTokens = 4000, strategy = 'direct' } = body;

    if (!modelName || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'modelName, provider, and apiKey are required' },
        { status: 400 }
      );
    }

    // Create the model run with pending status
    const modelRun = await prisma.modelRun.create({
      data: {
        generationId: id,
        modelName,
        provider,
        strategy,
        status: 'pending',
        metadata: { temperature, maxTokens },
      },
    });

    // Return the created run immediately
    // The client will poll for updates or we'll update it via a separate endpoint
    return NextResponse.json(modelRun);
  } catch (error) {
    console.error('Error creating model run:', error);
    return NextResponse.json(
      { error: 'Failed to create model run' },
      { status: 500 }
    );
  }
}
