import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminKey } from '@/lib/adminAuth';

// POST /api/jobs - Create a new job (ADMIN ONLY)
export async function POST(req: NextRequest) {
  try {
    const { concept, model, adminKey } = await req.json();

    // Verify admin key
    if (!adminKey || !verifyAdminKey(adminKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid admin key' },
        { status: 401 }
      );
    }

    if (!concept) {
      return NextResponse.json({ error: 'concept is required' }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        concept,
        model: model || 'unknown',
        status: 'pending',
      },
    });

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Error creating job:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/jobs - List all jobs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    const jobs = await prisma.job.findMany({
      where: status ? { status } : undefined,
      include: {
        puzzles: {
          select: {
            id: true,
            idea: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(jobs);
  } catch (err: any) {
    console.error('Error fetching jobs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
