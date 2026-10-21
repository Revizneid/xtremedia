/**
 * scripts/list-suspicious-durations.ts
 *
 * Script CHỈ ĐỌC: liệt kê bài hát có thời lượng nghi sai.
 * Tiêu chí nghi sai:
 *   - durationSeconds <= 1  (bao gồm 0, 1 — do bug normalizeDuration cũ)
 *   - durationSeconds === 180 (fallback cũ)
 *   - durationSeconds === 210 (fallback cũ trong admin/songs POST)
 *
 * Sử dụng:
 *   node --experimental-strip-types scripts/list-suspicious-durations.ts
 *
 * KHÔNG tự sửa dữ liệu. Mang danh sách này vào AdminCP để sửa tay.
 */

import { db } from '../src/lib/db';

const SUSPICIOUS_EXACT = new Set([180, 210]);

async function main() {
  const songs = await db.getSongs();

  const suspicious = songs.filter((song) => {
    const d = song.durationSeconds;
    return d <= 1 || SUSPICIOUS_EXACT.has(d);
  });

  if (suspicious.length === 0) {
    console.log('[list-suspicious-durations] Không tìm thấy bài nào có thời lượng nghi sai. ✅');
    return;
  }

  console.log(
    `[list-suspicious-durations] Tìm thấy ${suspicious.length} bài có thời lượng nghi sai:\n`
  );

  console.log(
    'id | title | artistName | durationSeconds | audioUrl'
  );
  console.log('-'.repeat(120));

  for (const song of suspicious) {
    const reason =
      song.durationSeconds <= 1
        ? `<= 1s (bug normalizeDuration cũ hoặc chưa đọc MP3)`
        : `= ${song.durationSeconds}s (fallback mặc định cũ: 180/210)`;

    console.log(
      `${song.id} | ${song.title} | ${song.artistName} | ${song.durationSeconds} | ${song.audioUrl}`
    );
    console.log(`  → Lý do nghi sai: ${reason}`);
  }

  console.log('\n[HƯỚNG DẪN] Vào AdminCP → sửa thời lượng thật cho từng bài ở trên.');
  console.log('[CHÚ Ý] Script này KHÔNG tự sửa dữ liệu.');

  // Xuất JSON để dễ copy vào báo cáo
  console.log('\n[JSON]');
  console.log(
    JSON.stringify(
      suspicious.map((s) => ({
        id: s.id,
        title: s.title,
        artistName: s.artistName,
        durationSeconds: s.durationSeconds,
        audioUrl: s.audioUrl,
        createdAt: s.createdAt,
      })),
      null,
      2
    )
  );
}

void main().catch((err) => {
  console.error('[list-suspicious-durations] Lỗi:', err);
  process.exit(1);
});
