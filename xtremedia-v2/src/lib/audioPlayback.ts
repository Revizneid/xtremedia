import { Song } from '@/lib/types';

export const DEFAULT_FALLBACK_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export function sanitizeAudioUrl(input?: string | null): string {
  const raw = input?.trim();
  if (!raw) {
    return DEFAULT_FALLBACK_AUDIO_URL;
  }

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const isPlaceholder = hostname === 'example.com' || hostname.endsWith('.example.com') || raw.includes('example.com');
    const looksLikeAudio = /\.(mp3|ogg|wav|m4a|aac)(\?.*)?$/i.test(parsed.pathname) || parsed.pathname.includes('audio');

    if (isPlaceholder || (!parsed.protocol.startsWith('https') && !parsed.protocol.startsWith('http')) || !looksLikeAudio) {
      return DEFAULT_FALLBACK_AUDIO_URL;
    }

    return raw;
  } catch {
    return DEFAULT_FALLBACK_AUDIO_URL;
  }
}

export function resolveSongStreamSource(song: Song): string {
  const url = sanitizeAudioUrl(song.audioUrl);
  const shouldUseProxy = !song.audioUrl || song.audioUrl.startsWith('/media/') || song.audioUrl.startsWith('media/') || !/^https?:\/\//i.test(song.audioUrl);

  return shouldUseProxy ? `/api/stream?id=${song.id}` : url;
}

export function isExpectedPlaybackAbort(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; message?: string };
  const name = candidate.name?.toLowerCase() ?? '';
  const message = candidate.message?.toLowerCase() ?? '';

  if (name !== 'aborterror') {
    return false;
  }

  return message.includes('pause') || message.includes('interrupted') || message.includes('aborted');
}
