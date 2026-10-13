import { NextResponse } from 'next/server';
import { env, hasDatabaseConfig } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export async function GET() {
  if (!hasDatabaseConfig || !env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        database: 'not-configured',
        error: 'DATABASE_URL is missing or empty. Set the Supabase/PostgreSQL connection string in .env.local.',
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, database: 'connected' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[health] Database check failed:', error);
    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        error: message,
      },
      { status: 503 }
    );
  }
}
