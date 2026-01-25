import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const puzzle = await prisma.puzzle.findUnique({
    where: { id },
    include: {
      generations: {
        include: {
          pairs: {
            orderBy: { order: 'asc' },
          },
          feedback: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!puzzle) {
    return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
  }

  return NextResponse.json(puzzle);
}
