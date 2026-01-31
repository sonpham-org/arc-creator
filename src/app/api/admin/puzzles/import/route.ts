import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';
import { generatePuzzleId } from '@/lib/puzzleId';

/**
 * POST /api/admin/puzzles/import
 * 
 * Bulk import official ARC puzzles from datasets (2024, 2025, etc.)
 * 
 * Request body:
 * {
 *   "adminKey": "secret_key",
 *   "source": "arc-2024-training" | "arc-2024-evaluation" | "arc-2025-training" | "arc-2025-evaluation",
 *   "puzzles": {
 *     "puzzle_id": {
 *       "train": [{"input": [[...]], "output": [[...]]}],
 *       "test": [{"input": [[...]]}]  // optional, for evaluation sets
 *     }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { adminKey, source, puzzles } = await req.json();

    // Verify admin key
    if (!adminKey || !verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid admin key' },
        { status: 401 }
      );
    }

    if (!source || !puzzles) {
      return NextResponse.json(
        { error: 'Missing required fields: source, puzzles' },
        { status: 400 }
      );
    }

    // Validate source format
    const validSources = [
      'arc-2024-training',
      'arc-2024-evaluation',
      'arc-2024-test',
      'arc-2025-training',
      'arc-2025-evaluation',
      'arc-2025-test',
    ];

    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each puzzle
    for (const [arcId, puzzleData] of Object.entries(puzzles) as [string, any][]) {
      try {
        // Combine train and test pairs
        const trainPairs = puzzleData.train || [];
        const testPairs = puzzleData.test || [];
        
        if (trainPairs.length === 0) {
          results.errors.push(`${arcId}: No training pairs found`);
          results.failed++;
          continue;
        }

        // Create the idea/description from source
        const idea = `Official ARC puzzle from ${source} (ID: ${arcId})`;

        // Prepare pairs with proper ordering and test designation
        const allPairs = [
          ...trainPairs.map((pair: any, i: number) => ({
            input: pair.input,
            output: pair.output,
            order: i,
            isTestCase: false,
          })),
          ...testPairs.map((pair: any, i: number) => ({
            input: pair.input,
            output: pair.output || null, // Test pairs may not have outputs
            order: trainPairs.length + i,
            isTestCase: true,
          })),
        ];

        // Generate content-based ID (or use ARC ID format)
        const puzzleId = arcId; // Use original ARC ID for traceability

        // Check if puzzle already exists
        const existingPuzzle = await prisma.puzzle.findUnique({
          where: { id: puzzleId },
        });

        if (existingPuzzle) {
          results.skipped++;
          continue;
        }

        // Create puzzle and generation in transaction
        await prisma.$transaction(async (tx) => {
          const puzzle = await tx.puzzle.create({
            data: {
              id: puzzleId,
              idea,
              source, // Mark as official dataset puzzle
            },
          });

          await tx.generation.create({
            data: {
              puzzleId: puzzle.id,
              parentGenId: null, // No parent - this is the OG
              tokensUsed: 0,
              timeTakenMs: 0,
              reasoning: `Official ARC puzzle imported from ${source}`,
              pairs: {
                create: allPairs,
              },
            },
          });
        });

        results.imported++;
      } catch (err: any) {
        console.error(`Failed to import puzzle ${arcId}:`, err);
        results.errors.push(`${arcId}: ${err.message}`);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      source,
      ...results,
    });
  } catch (err: any) {
    console.error('Error importing puzzles:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
