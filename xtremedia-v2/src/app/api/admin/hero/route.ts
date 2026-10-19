import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE_NAME, verifyAdminRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { heroRepo, toLegacyHeroConfig } from '@/lib/repositories/heroRepo';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const heroBodySchema = z.object({
  id: z.string().trim().max(120).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
  imageUrl: z.string().trim().max(2048).nullable().optional(),
  linkUrl: z.string().trim().max(2048).nullable().optional(),
  songId: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).optional(),
  isActive: z.boolean().optional(),
});

function buildStructuredErrorLog(step: string, error: unknown, request: NextRequest) {
  const err = error as { name?: string; message?: string; code?: string; stack?: string };

  return {
    errorId: crypto.randomUUID(),
    route: '/api/admin/hero',
    method: request.method,
    step,
    name: err?.name || 'Error',
    prismaCode: err?.code || null,
    message: err?.message || String(error),
    stack: (err?.stack || '').split('\n').slice(0, 8).join('\n'),
  };
}

async function requireAdmin(request: NextRequest): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));

  if (!auth.authorized) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: auth.error, errorId: crypto.randomUUID() }, { status: auth.status }),
    };
  }

  return { ok: true };
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const records = await heroRepo.list();
    const firstActive = records.find((item) => item.isActive) ?? records[0] ?? null;
    const songs = await db.getSongs({ sortBy: 'top_plays' });

    return NextResponse.json({
      success: true,
      records,
      active: records.filter((item) => item.isActive),
      config: firstActive ? toLegacyHeroConfig(firstActive) : null,
      songs: songs.slice(0, 20),
      message: firstActive ? 'Hero banner đang hoạt động.' : 'Chưa có banner nào.',
    });
  } catch (error: unknown) {
    const payload = buildStructuredErrorLog('get', error, request);
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const originResponse = enforceAdminOrigin(request);
    if (originResponse) {
      return originResponse;
    }

    const bodyResult = await parseJsonBody(request, heroBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

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

    const created = await heroRepo.create({
      title,
      subtitle,
      imageUrl,
      linkUrl,
      songId,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    });

    return NextResponse.json({ success: true, data: created, message: 'Hero Banner đã được tạo thành công.' }, { status: 201 });
  } catch (error: unknown) {
    const payload = buildStructuredErrorLog('create', error, request);
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const originResponse = enforceAdminOrigin(request);
    if (originResponse) {
      return originResponse;
    }

    const bodyResult = await parseJsonBody(request, heroBodySchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const payload = bodyResult.data;
    const targetId = payload.id || (await heroRepo.getActive()).at(0)?.id || null;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy banner để cập nhật', errorId: crypto.randomUUID() }, { status: 404 });
    }

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

    const updated = await heroRepo.update(targetId, {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      songId,
      sortOrder: payload.sortOrder ?? undefined,
      isActive: payload.isActive ?? undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy banner để cập nhật', errorId: crypto.randomUUID() }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Cập nhật Hero Banner thành công!' }, { status: 200 });
  } catch (error: unknown) {
    const payload = buildStructuredErrorLog('update', error, request);
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const originResponse = enforceAdminOrigin(request);
    if (originResponse) {
      return originResponse;
    }

    const id = request.nextUrl.searchParams.get('id') || request.headers.get('x-hero-banner-id');
    if (!id) {
      const bodyResult = await parseJsonBody(request, z.object({ id: z.string().trim().max(120).optional() }).passthrough());
      if (bodyResult.ok && bodyResult.data.id) {
        const deleted = await heroRepo.remove(bodyResult.data.id);
        return NextResponse.json(
          { success: deleted, message: deleted ? 'Hero Banner đã bị xoá.' : 'Không tìm thấy banner để xoá.', errorId: deleted ? undefined : crypto.randomUUID() },
          { status: deleted ? 200 : 404 }
        );
      }

      return NextResponse.json({ success: false, error: 'Thiếu id banner cần xoá', errorId: crypto.randomUUID() }, { status: 400 });
    }

    const deleted = await heroRepo.remove(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy banner để xoá', errorId: crypto.randomUUID() }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Hero Banner đã bị xoá.' }, { status: 200 });
  } catch (error: unknown) {
    const payload = buildStructuredErrorLog('delete', error, request);
    console.error(JSON.stringify(payload));
    return NextResponse.json({ success: false, error: 'internal_error', errorId: payload.errorId }, { status: 500 });
  }
}

