import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { callLLM, getServerApiKey, type LLMProvider } from '@/lib/llm';

/**
 * POST /api/admin/agent/enqueue
 *
 * Uses Gemini (preferred) to brainstorm imaginative puzzle concepts inspired
 * by stories, IQ puzzles, detective mysteries, nature, and everyday life.
 * Creates a Job for each concept.
 *
 * Body: { adminKey: string, count?: number }
 */

// Inspiration themes — rotated per batch for maximum diversity
const INSPIRATION_THEMES = [
  `Detective mysteries & whodunits: Think of clues left at a crime scene — fingerprints that mirror each other, a sequence of locked rooms where each reveals a pattern, a cipher where colors encode a hidden message, a trail of evidence that must be followed in order.`,

  `Fairy tales & mythology: A magic mirror that reflects everything except one color. A dragon's scales that grow in a spiral. Rapunzel's tower where each floor is a transformed version of the one below. A labyrinth where walls shift based on which path you took.`,

  `Nature & biology: How crystals grow from a seed — expanding symmetrically outward. How rivers carve paths following gravity and terrain. How trees branch — each fork splitting the pattern. How caterpillars become butterflies — one shape morphing into a completely different one.`,

  `Architecture & engineering: A blueprint where removing walls reveals hidden rooms. Stained glass windows with repeating motifs at different scales. A building reflected in a lake but with some floors missing. Bridges connecting islands where the bridge color depends on which islands it joins.`,

  `Music & rhythm: A drum pattern that repeats every 4 beats but shifts position each cycle. A melody that inverts — high notes become low. A round (like "Row Row Row") where the same pattern appears offset in time. A chord where combining certain notes produces a new color.`,

  `Games & sports: Chess pieces that paint the squares they move through. Tetris-like pieces falling and stacking with gravity. A domino chain where each piece must match its neighbor. A maze where you must collect all keys (colors) before reaching the exit.`,

  `Cooking & chemistry: Mixing two colored ingredients to produce a third. A recipe where layers are added from bottom to top in a specific order. Fermentation where cells gradually change color based on their neighbors. Cutting a cake to reveal a hidden pattern inside.`,

  `Weather & astronomy: Constellations that connect dots of the same color. A sunrise where light spreads from one edge, gradually revealing what's underneath. Snowflakes growing with 6-fold symmetry. Tides that push objects toward or away from an edge.`,

  `Maps & geography: Coloring countries so no two neighbors share a color. Rivers flowing downhill from mountains to sea, merging when they meet. Tectonic plates sliding past each other, carrying their patterns along. Treasure maps where X marks the intersection of two colored paths.`,

  `Everyday life & machines: A vending machine that sorts items by color into columns. An elevator that picks up passengers (colored cells) floor by floor. A washing machine that separates darks from lights. A clock where hands sweep across the grid, transforming everything they touch.`,

  `Optical illusions & perception: An Escher-like staircase where following the pattern loops back on itself. A figure-ground reversal where background becomes foreground. A zoomed-in view that reveals fractal self-similarity. Anamorphic art that only makes sense when viewed from the right angle (projection).`,

  `Storytelling & narrative: A story told in panels left-to-right where each panel transforms the previous one. A "choose your own adventure" where the path taken determines the output. A time-lapse where a scene slowly changes — flowers bloom, snow melts, day turns to night.`,
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, count = 100 } = body;

    if (!verifyAdminKey(adminKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Providers for concept generation — will round-robin across them
    const conceptProviders: { provider: LLMProvider; model: string }[] = [
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'mistral', model: 'mistral-large-latest' },
      { provider: 'cerebras', model: 'llama-3.3-70b' },
    ];

    // Filter to those with API keys
    const availableProviders = conceptProviders.filter(cp => getServerApiKey(cp.provider) !== null);
    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: 'No free LLM API key available for concept generation' },
        { status: 400 }
      );
    }

    // Fetch existing job concepts to avoid duplicates
    const existingJobs = await prisma.job.findMany({
      select: { concept: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const existingConcepts = existingJobs.map(j => j.concept);

    // Generate concepts in batches
    const batchSize = 20;
    const numBatches = Math.ceil(count / batchSize);
    const allConcepts: string[] = [];

    for (let batch = 0; batch < numBatches; batch++) {
      const remaining = count - allConcepts.length;
      const thisBatch = Math.min(batchSize, remaining);
      if (thisBatch <= 0) break;

      // Rotate through inspiration themes
      const theme = INSPIRATION_THEMES[batch % INSPIRATION_THEMES.length];

      const exclusionBlock = [...existingConcepts, ...allConcepts].length > 0
        ? `\n\nDO NOT generate concepts similar to any of these existing ones:\n${[...existingConcepts, ...allConcepts].slice(-200).map(c => `- ${c}`).join('\n')}`
        : '';

      const systemPrompt = `You are a wildly creative puzzle inventor who draws inspiration from literature, detective stories, nature, music, games, and everyday life to design grid-based visual puzzles.

Your puzzles are for the ARC (Abstraction and Reasoning Corpus) — each one is a rule that transforms a small colored grid (max 30x30, colors 0-9) from input to output. But your CONCEPTS should be vivid, imaginative, and tell a tiny story — not dry mathematical descriptions.

Output ONLY a JSON object: {"concepts": ["...", "..."]}`;

      const userPrompt = `Invent ${thisBatch} wildly original ARC puzzle concepts. Each concept should:
- Be 1-3 sentences that paint a vivid picture or tell a micro-story
- Describe a specific, implementable grid transformation (not vague)
- Feel like it comes from a novel, a riddle, a nature documentary, or a game — NOT a math textbook

INSPIRATION FOR THIS BATCH:
${theme}

EXAMPLES of the style I want:
- "A lighthouse beam sweeps across the grid from the top-left corner. Every cell it touches turns to the color of the nearest coastal cell (edge cell). Cells already on the edge stay unchanged — they are the coastline."
- "Imagine each colored region is an island. Build bridges (single-cell-wide lines) connecting every island to its nearest neighbor. The bridge takes the color of whichever island is smaller."
- "A detective examines the grid and finds that exactly one row is lying — its colors are the opposite of what they should be if the pattern in every other row were followed. Fix the lying row."
- "Seeds (non-black cells) are planted in soil (black grid). Each seed grows into a flower — expanding outward in a diamond shape, one layer per step, until flowers from different seeds touch. Where two flowers meet, they blend into a new color (sum mod 10)."${exclusionBlock}

Output ONLY valid JSON: {"concepts": [...]}. No markdown fences, no explanation outside the JSON.`;

      // Try each provider until one works for this batch
      let batchSuccess = false;
      for (let provIdx = 0; provIdx < availableProviders.length; provIdx++) {
        const cp = availableProviders[(batch + provIdx) % availableProviders.length];
        const cpKey = getServerApiKey(cp.provider)!;

        try {
          const result = await callLLM(
            cp.provider,
            cpKey,
            systemPrompt,
            userPrompt,
            cp.model,
          );

          let parsed: string[];
          let text = result.content.trim();
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (fenceMatch) text = fenceMatch[1];
          const obj = JSON.parse(text);
          if (Array.isArray(obj)) {
            parsed = obj;
          } else if (Array.isArray(obj.concepts)) {
            parsed = obj.concepts;
          } else {
            throw new Error('No concepts array found');
          }

          allConcepts.push(...parsed.slice(0, thisBatch));
          batchSuccess = true;
          break; // Move to next batch
        } catch (err: any) {
          console.error(`Concept batch ${batch} failed with ${cp.provider}/${cp.model}: ${err.message?.substring(0, 100)}`);
          continue; // Try next provider
        }
      }

      if (!batchSuccess) {
        console.error(`Concept batch ${batch} failed on all providers, skipping`);
      }
    }

    if (allConcepts.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any concepts from LLM' },
        { status: 500 }
      );
    }

    // Create a Job for each concept
    let created = 0;
    for (const concept of allConcepts) {
      await prisma.job.create({
        data: {
          concept,
          status: 'pending',
          model: null,
        },
      });
      created++;
    }

    return NextResponse.json({
      message: `Enqueued ${created} agent puzzle jobs`,
      created,
      providers: availableProviders.map(p => `${p.provider}/${p.model}`),
      sampleConcepts: allConcepts.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Error in agent enqueue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enqueue agent jobs' },
      { status: 500 }
    );
  }
}
