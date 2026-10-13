import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, database: 'connected' }, { status: 200 });
  } catch (error) {
    console.error('[health] Database check failed:', error);
    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        error: 'Database unavailable',
      },
      { status: 503 }
    );
  }
}
