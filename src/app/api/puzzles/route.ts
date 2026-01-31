import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProvider, callLLM } from '@/lib/llm';
import { generatePuzzleId } from '@/lib/puzzleId';

export async function POST(req: NextRequest) {
  try {
    const { idea, apiKey: providedApiKey, model, jobId } = await req.json();

    if (!idea) {
      return NextResponse.json({ error: 'Missing idea' }, { status: 400 });
    }

    // Use provided API key or fallback to environment variable
    const apiKey = providedApiKey || process.env.PUZZLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key (provide in request or set PUZZLE_API_KEY env var)' }, { status: 400 });
    }

    // Update job status to running if jobId provided
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'running' },
      });
    }

    const provider = detectProvider(apiKey);
    if (provider === 'unknown') {
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: { 
            status: 'failed',
            errorMessage: 'Unsupported or unknown API key'
          },
        });
      }
      return NextResponse.json({ error: 'Unsupported or unknown API key' }, { status: 400 });
    }

    // Call the Agent (LLM)
    const startTime = Date.now();
    const systemPrompt = 'You are an ARC puzzle creator. Generate a challenge with 5 input/output pairs based on a concept. Output strictly JSON with "pairs": [{"input": [[]], "output": [[]]}] and "explanation": "string". Pairs must be exactly 5. Colors 0-9. Max grid 30x30.';
    const userPrompt = `Concept: ${idea}`;

    const { content: llmContent, tokensUsed } = await callLLM(provider, apiKey, systemPrompt, userPrompt, model);
    
    const endTime = Date.now();
    const timeTakenMs = endTime - startTime;

    let content;
    try {
      content = JSON.parse(llmContent);
    } catch (e) {
      console.error('Failed to parse LLM response', llmContent);
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: { 
            status: 'failed',
            errorMessage: 'Failed to generate valid ARC puzzle',
            tokensUsed,
            timeTakenMs
          },
        });
      }
      return NextResponse.json({ error: 'Failed to generate valid ARC puzzle' }, { status: 500 });
    }

    // Generate content-based ID from pairs
    const pairsWithOrder = content.pairs.map((p: any, i: number) => ({
      input: p.input,
      output: p.output,
      order: i,
    }));
    const puzzleId = generatePuzzleId(pairsWithOrder);

    // Check if puzzle already exists
    const existingPuzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      include: {
        generations: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (existingPuzzle) {
      // Puzzle already exists, link to job if provided
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            puzzleId,
            tokensUsed,
            timeTakenMs,
          },
        });
      }
      return NextResponse.json({ 
        id: puzzleId, 
        generationId: existingPuzzle.generations[0]?.id,
        existing: true 
      });
    }

    // Mark the last 1-2 pairs as test cases for model evaluation
    const totalPairs = content.pairs.length;
    const numTestCases = Math.min(2, Math.floor(totalPairs * 0.4)); // 40% or max 2 test cases
    
    // Create the Puzzle and Generation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const puzzle = await tx.puzzle.create({
        data: {
          id: puzzleId,
          idea: idea,
          source: 'generated',
          jobId: jobId || null,
        },
      });

      const generation = await tx.generation.create({
        data: {
          puzzleId: puzzle.id,
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

      return { puzzle, generation };
    });

    // Update job status to completed
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          puzzleId,
          tokensUsed,
          timeTakenMs,
        },
      });
    }

    return NextResponse.json({ id: result.puzzle.id, generationId: result.generation.id });
  } catch (err: any) {
    console.error(err);
    
    // Update job as failed if jobId provided
    const body = await req.json().catch(() => ({}));
    if (body.jobId) {
      await prisma.job.update({
        where: { id: body.jobId },
        data: {
          status: 'failed',
          errorMessage: err.message,
        },
      }).catch(console.error);
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const puzzles = await prisma.puzzle.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { generations: true }
      }
    }
  });
  return NextResponse.json(puzzles);
}
