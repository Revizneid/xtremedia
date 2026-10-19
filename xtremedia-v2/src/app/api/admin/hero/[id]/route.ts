import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE_NAME, verifyAdminRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { heroRepo, toLegacyHeroConfig } from '@/lib/repositories/heroRepo';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export const runtime = 'nodejs';

const heroBodySchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  linkUrl: z.string().trim().max(2048).nullable().optional(),
  songId: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: auth.error, errorId: crypto.randomUUID() }, { status: auth.status }) };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) return adminCheck.response;
    const { id } = await params;
    const record = await heroRepo.getById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy banner', errorId: crypto.randomUUID() }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record, config: toLegacyHeroConfig(record) });
  } catch (error: unknown) {
    const payload = {
      errorId: crypto.randomUUID(),
      route: '/api/admin/hero/[id]',
      method: request.method,
      step: 'get-by-id',
      name: error instanceof Error ? error.name : 'Error',
      prismaCode: null,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : '',
    };
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) return adminCheck.response;
    const originResponse = enforceAdminOrigin(request);
    if (originResponse) return originResponse;

    const { id } = await params;
    const bodyResult = await parseJsonBody(request, heroBodySchema);
    if (!bodyResult.ok) return bodyResult.response;

    const payload = bodyResult.data;
    const title = payload.title?.trim() || 'Top Thịnh Hành Tháng';
    const subtitle = payload.subtitle?.trim() ?? null;
    const imageUrl = payload.imageUrl && payload.imageUrl.trim() ? payload.imageUrl.trim() : null;
    const linkUrl = payload.linkUrl && payload.linkUrl.trim() ? payload.linkUrl.trim() : null;
    const songId = payload.songId && payload.songId.trim() ? payload.songId.trim() : null;

    if (imageUrl && !isHttpsUrl(imageUrl)) {
      return NextResponse.json({ success: false, error: 'imageUrl phải là URL https hợp lệ', errorId: crypto.randomUUID() }, { status: 400 });
    }
    if (linkUrl && !(isHttpsUrl(linkUrl) || linkUrl.startsWith('/'))) {
      return NextResponse.json({ success: false, error: 'linkUrl phải là URL https hợp lệ hoặc đường dẫn nội bộ bắt đầu bằng "/"', errorId: crypto.randomUUID() }, { status: 400 });
    }
    if (songId) {
      const song = await db.getSongById(songId);
      if (!song) {
        return NextResponse.json({ success: false, error: 'Bài hát được chọn không tồn tại', errorId: crypto.randomUUID() }, { status: 400 });
      }
    }

    const updated = await heroRepo.update(id, {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      songId,
      sortOrder: payload.sortOrder ?? undefined,
      isActive: payload.isActive ?? undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy banner', errorId: crypto.randomUUID() }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Cập nhật Hero Banner thành công!' }, { status: 200 });
  } catch (error: unknown) {
    const payload = {
      errorId: crypto.randomUUID(),
      route: '/api/admin/hero/[id]',
      method: request.method,
      step: 'update-by-id',
      name: error instanceof Error ? error.name : 'Error',
      prismaCode: null,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : '',
    };
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) return adminCheck.response;
    const originResponse = enforceAdminOrigin(request);
    if (originResponse) return originResponse;
    const { id } = await params;
    const deleted = await heroRepo.remove(id);
    return NextResponse.json({ success: deleted, message: deleted ? 'Hero Banner đã bị xoá.' : 'Không tìm thấy banner để xoá.', errorId: deleted ? undefined : crypto.randomUUID() }, { status: deleted ? 200 : 404 });
  } catch (error: unknown) {
    const payload = {
      errorId: crypto.randomUUID(),
      route: '/api/admin/hero/[id]',
      method: request.method,
      step: 'delete-by-id',
      name: error instanceof Error ? error.name : 'Error',
      prismaCode: null,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : '',
    };
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}
