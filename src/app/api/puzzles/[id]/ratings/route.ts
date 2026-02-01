import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ratings = await prisma.rating.findMany({
      where: { puzzleId: id },
    });

    if (ratings.length === 0) {
      return NextResponse.json({
        count: 0,
        averages: { quality: 0, difficulty: 0, interestingness: 0 },
      });
    }

    const averages = {
      quality: ratings.reduce((sum, r) => sum + r.quality, 0) / ratings.length,
      difficulty: ratings.reduce((sum, r) => sum + r.difficulty, 0) / ratings.length,
      interestingness: ratings.reduce((sum, r) => sum + r.interestingness, 0) / ratings.length,
    };

    return NextResponse.json({
      count: ratings.length,
      averages,
    });
  } catch (err: any) {
    console.error('Error fetching ratings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { quality, difficulty, interestingness, userId } = await req.json();

    if (!quality || !difficulty || !interestingness) {
      return NextResponse.json(
        { error: 'Missing required fields: quality, difficulty, interestingness' },
        { status: 400 }
      );
    }

    if ([quality, difficulty, interestingness].some(v => v < 1 || v > 5)) {
      return NextResponse.json(
        { error: 'Ratings must be between 1 and 5' },
        { status: 400 }
      );
    }

    const rating = await prisma.rating.create({
      data: {
        puzzleId: id,
        userId: userId || null,
        quality,
        difficulty,
        interestingness,
      },
    });

    return NextResponse.json(rating);
  } catch (err: any) {
    console.error('Error creating rating:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
