/**
 * syncLogDecision.ts – Logic quyết định duplicate/idempotency THUẦN (không có I/O, không có DB).
 *
 * Các hàm ở đây nhận dữ liệu, trả quyết định. Có thể test mà không cần DB.
 */

/**
 * Xây WHERE clause để tìm bài hát trùng theo audioUrl hoặc videoId+trim.
 * KHÔNG có title/artist trong điều kiện → title alone không đủ để là duplicate.
 */
export function buildSongMatchWhere(payload: {
  normalizedAudioUrl: string;
  videoId?: string | null;
  trimStart?: number;
  trimEnd?: number;
}): { OR: Array<Record<string, unknown>> } {
  const clauses: Array<Record<string, unknown>> = [];

  if (payload.normalizedAudioUrl) {
    clauses.push({ audioUrl: payload.normalizedAudioUrl });
  }

  if (payload.videoId) {
    clauses.push({
      AND: [
        { videoId: { equals: payload.videoId, mode: 'insensitive' } },
        { trimStart: Number(payload.trimStart ?? 0) },
        { trimEnd: Number(payload.trimEnd ?? 0) },
      ],
    });
  }

  return { OR: clauses };
}

/**
 * Quyết định xem một bài hát mới có phải duplicate không, chỉ dựa trên dữ liệu được truyền vào.
 *
 * @param existingLog - SyncLog đã tồn tại cho idempotencyKey này (null = chưa có)
 * @param existingSong - Bài hát đã tồn tại trong DB match theo audioUrl/videoId (null = chưa có)
 * @returns 'REUSED' | 'NEW'
 */
export function decideSyncOutcome(
  existingLog: { id: string } | null,
  existingSong: { id: string } | null
): 'REUSED' | 'NEW' {
  if (existingLog !== null) return 'REUSED';
  if (existingSong !== null) return 'REUSED';
  return 'NEW';
}

/**
 * Kiểm tra xem WHERE clause buildSongMatchWhere có chứa title/artist không.
 * Đây là bất biến quan trọng: title và artist KHÔNG được dùng để xác định duplicate.
 */
export function whereClauseContainsTitleOrArtist(
  where: { OR: Array<Record<string, unknown>> }
): boolean {
  return where.OR.some((clause) => {
    if ('title' in clause || 'artistId' in clause || 'artistName' in clause) {
      return true;
    }
    if ('AND' in clause && Array.isArray((clause as any).AND)) {
      return (clause as any).AND.some(
        (part: Record<string, unknown>) => 'title' in part || 'artistId' in part
      );
    }
    return false;
  });
}
