import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProvider, callLLM } from '@/lib/llm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { generationId, verbalFeedback, gridEdits, apiKey, model } = await req.json();

  try {
    const provider = detectProvider(apiKey);
    if (provider === 'unknown') {
      return NextResponse.json({ error: 'Unsupported or unknown API key' }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id },
    });

    if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });

    const currentGen = await prisma.generation.findUnique({
      where: { id: generationId },
      include: { pairs: true },
    });

    if (!currentGen) return NextResponse.json({ error: 'Generation not found' }, { status: 404 });

    // 1. Save feedback to the current generation
    await prisma.feedback.upsert({
      where: { generationId },
      update: { text: verbalFeedback, gridEdits: gridEdits },
      create: { generationId, text: verbalFeedback, gridEdits: gridEdits },
    });

    // 2. Call LLM for new iteration
    const startTime = Date.now();
    const systemPrompt = 'You are an ARC puzzle creator iterating on a design. You will receive the original concept, the current version, and human feedback/corrections. Your goal is to refine the puzzle to better match the concept and address feedback. Output strictly JSON with "pairs": [{"input": [[]], "output": [[]]}], and "explanation": "string".';
    const userPrompt = `
Original Concept: ${puzzle.idea}
Current Version pairs: ${JSON.stringify(currentGen.pairs)}
Human Feedback: ${verbalFeedback}
Human Corrected Grids: ${JSON.stringify(gridEdits)}

Generate the next version of the 5 pairs.`;

    const { content: llmContent, tokensUsed } = await callLLM(provider, apiKey, systemPrompt, userPrompt, model);
    
    const endTime = Date.now();
    const timeTakenMs = endTime - startTime;

    let content;
    try {
      content = JSON.parse(llmContent);
    } catch (e) {
      console.error('Failed to parse LLM response', llmContent);
      return NextResponse.json({ error: 'Failed to generate valid iteration' }, { status: 500 });
    }

    // 3. Create the new Generation
    // Preserve test case designation based on the previous generation
    const totalPairs = content.pairs.length;
    const numTestCases = currentGen.pairs.filter(p => p.isTestCase).length;
    
    const newGen = await prisma.generation.create({
      data: {
        puzzleId: id,
        parentGenId: generationId,
        tokensUsed,
        timeTakenMs,
        reasoning: content.explanation || '',
        pairs: {
          create: content.pairs.map((p: any, i: number) => ({
            input: p.input,
            output: p.output,
            order: i,
            isTestCase: i >= totalPairs - numTestCases, // Preserve test case count
          })),
        },
      },
    });

    return NextResponse.json({ newGenerationId: newGen.id });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
