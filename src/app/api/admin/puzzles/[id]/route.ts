import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';

/**
 * PATCH /api/admin/puzzles/[id]
 * 
 * Update puzzle metadata (tags, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { adminKey, tags } = await req.json();

    // Verify admin key
    if (!adminKey || !verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid admin key' },
        { status: 401 }
      );
    }

    // Update puzzle
    const puzzle = await prisma.puzzle.update({
      where: { id },
      data: { tags },
    });

    return NextResponse.json({ success: true, puzzle });
  } catch (err: any) {
    console.error('Error updating puzzle:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
