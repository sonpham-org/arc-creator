import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProvider, callLLM } from '@/lib/llm';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);

export async function POST(req: NextRequest) {
  try {
    const { idea, apiKey, model } = await req.json();

    if (!idea || !apiKey) {
      return NextResponse.json({ error: 'Missing idea or API key' }, { status: 400 });
    }

    const provider = detectProvider(apiKey);
    if (provider === 'unknown') {
      return NextResponse.json({ error: 'Unsupported or unknown API key' }, { status: 400 });
    }

    // 1. Create the Puzzle record with a random ID
    const puzzle = await prisma.puzzle.create({
      data: {
        id: nanoid(),
        idea: idea,
      },
    });

    // 2. Call the Agent (LLM)
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
      return NextResponse.json({ error: 'Failed to generate valid ARC puzzle' }, { status: 500 });
    }

    // 3. Save the initial Generation
    const generation = await prisma.generation.create({
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
          })),
        },
      },
    });

    return NextResponse.json({ id: puzzle.id, generationId: generation.id });
  } catch (err: any) {
    console.error(err);
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
