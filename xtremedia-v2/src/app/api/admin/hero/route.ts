import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { getHeroBannerConfig, saveHeroBannerConfig } from '@/lib/heroBanner';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

const heroSchema = z.object({
  enabled: z.boolean().optional(),
  songId: z.string().trim().max(120).nullable().optional(),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(220).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  backgroundImage: z.string().trim().max(2048).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const [config, songs] = await Promise.all([
    getHeroBannerConfig(),
    db.getSongs({ sortBy: 'top_plays' }),
  ]);

  return NextResponse.json({ success: true, config, songs: songs.slice(0, 20) });
}

export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 20, 60_000, 'admin-hero-banner');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const originResponse = enforceAdminOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  const bodyResult = await parseJsonBody(request, heroSchema);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const nextData = bodyResult.data;
  if (nextData.songId && nextData.songId.trim()) {
    const song = await db.getSongById(nextData.songId.trim());
    if (!song) {
      return NextResponse.json({ success: false, error: 'Bài hát được chọn không tồn tại' }, { status: 400 });
    }
  }

  if (nextData.backgroundImage && nextData.backgroundImage.trim() && !isHttpsUrl(nextData.backgroundImage.trim())) {
    return NextResponse.json({ success: false, error: 'backgroundImage phải là URL https hợp lệ' }, { status: 400 });
  }

  const saved = await saveHeroBannerConfig({
    enabled: nextData.enabled ?? true,
    songId: nextData.songId && nextData.songId.trim() ? nextData.songId.trim() : null,
    title: nextData.title?.trim() || 'Top Thịnh Hành Tháng',
    subtitle: nextData.subtitle?.trim() || 'XtreMedia Engine 2026',
    ctaLabel: nextData.ctaLabel?.trim() || 'Phát Ngay',
    backgroundImage: nextData.backgroundImage && nextData.backgroundImage.trim() ? nextData.backgroundImage.trim() : null,
  });

  return NextResponse.json({ success: true, config: saved, message: 'Cập nhật Hero Banner thành công!' });
}
