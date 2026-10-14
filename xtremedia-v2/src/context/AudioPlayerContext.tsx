'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Song, LyricLine } from '@/lib/types';
import { isExpectedPlaybackAbort, resolveSongStreamSource } from '@/lib/audioPlayback';

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  queueIndex: number;
  isLyricOpen: boolean;
  isQueueOpen: boolean;
  isGiftOpen: boolean;
  giftSong: Song | null;
  currentLyricIndex: number;
  parsedLyrics: LyricLine[];
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolumeLevel: (volume: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleLyricModal: () => void;
  toggleQueueDrawer: () => void;
  openGiftModal: (song?: Song) => void;
  closeGiftModal: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

  for (const line of lines) {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3] ? parseFloat('0.' + match[3]) : 0;
      const totalTime = minutes * 60 + seconds + fraction;
      const text = match[4].trim();
      if (text) {
        result.push({ time: totalTime, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);

  // Modals & Drawers
  const [isLyricOpen, setIsLyricOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isGiftOpen, setIsGiftOpen] = useState<boolean>(false);
  const [giftSong, setGiftSong] = useState<Song | null>(null);

  // Synchronized Lyrics
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const parsedLyricsRef = useRef<LyricLine[]>([]);
  const repeatModeRef = useRef(repeatMode);
  const nextTrackRef = useRef<() => void>(() => {});

  useEffect(() => {
    parsedLyricsRef.current = parsedLyrics;
  }, [parsedLyrics]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Initialize Audio Object only once on the client
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume;

    const handleTimeUpdate = () => {
      const curr = audio.currentTime;
      setCurrentTime(curr);

      const lines = parsedLyricsRef.current;
      if (lines.length > 0) {
        let activeIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (curr >= lines[i].time) {
            activeIndex = i;
          } else {
            break;
          }
        }
        setCurrentLyricIndex(activeIndex);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        void audio.play().catch((err) => {
          if (!isExpectedPlaybackAbort(err)) {
            console.warn('Repeat-one playback failed:', err);
          }
        });
      } else {
        nextTrackRef.current();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Setup MediaSession API
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artistName,
        album: currentSong.albumTitle || 'XtreMedia V2',
        artwork: [
          { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }
  }, [currentSong]);

  // Update Lyric Lines when current song changes
  useEffect(() => {
    if (currentSong?.lyricsLrc) {
      const parsed = parseLRC(currentSong.lyricsLrc);
      setParsedLyrics(parsed);
      setCurrentLyricIndex(-1);
    } else {
      setParsedLyrics([]);
      setCurrentLyricIndex(-1);
    }
  }, [currentSong]);

  const playSong = useCallback((song: Song, newQueue?: Song[]) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const primarySource = resolveSongStreamSource(song);

    if (newQueue) {
      setQueue(newQueue);
      const index = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(index !== -1 ? index : 0);
    } else if (!queue.some((s) => s.id === song.id)) {
      setQueue((prev) => {
        const nextQueue = [...prev, song];
        setQueueIndex(prev.length);
        return nextQueue;
      });
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);

    audio.preload = 'auto';
    audio.pause();
    audio.currentTime = 0;
    audio.src = primarySource;
    audio.load();

    const startPlayback = () => {
      void audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (isExpectedPlaybackAbort(err)) {
          return;
        }

        console.warn('Primary audio source failed, retrying with proxy fallback:', err);
        const fallbackSource = `/api/stream?id=${song.id}`;
        if (audio.src !== fallbackSource) {
          audio.src = fallbackSource;
          audio.load();
          void audio.play().catch((playError) => {
            if (!isExpectedPlaybackAbort(playError)) {
              console.warn('Audio stream fallback failed:', playError);
            }
          });
          return;
        }

        setIsPlaying(false);
      });
    };

    startPlayback();

    fetch(`/api/songs/${song.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play' }),
      cache: 'no-store',
    }).catch(() => {});
  }, [queue]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (!isExpectedPlaybackAbort(err)) {
          console.warn(err);
        }
      });
    }
  }, [isPlaying, currentSong]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolumeLevel = useCallback((val: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(1, val));
    audioRef.current.volume = clamped;
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    setQueueIndex(nextIndex);
    playSong(queue[nextIndex]);
  }, [queue, queueIndex, isShuffle, repeatMode, playSong]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seek(0);
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    setQueueIndex(prevIndex);
    playSong(queue[prevIndex]);
  }, [queue, queueIndex, currentTime, seek, playSong]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => {
      if (!prev.some((s) => s.id === song.id)) {
        return [...prev, song];
      }
      return prev;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index === queueIndex) {
      nextTrack();
    } else if (index < queueIndex) {
      setQueueIndex((prev) => prev - 1);
    }
  }, [queueIndex, nextTrack]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const toggleLyricModal = useCallback(() => {
    setIsLyricOpen((prev) => !prev);
  }, []);

  const toggleQueueDrawer = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const openGiftModal = useCallback((song?: Song) => {
    setGiftSong(song || currentSong);
    setIsGiftOpen(true);
  }, [currentSong]);

  const closeGiftModal = useCallback(() => {
    setIsGiftOpen(false);
    setGiftSong(null);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume: isMuted ? 0 : volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        queueIndex,
        isLyricOpen,
        isQueueOpen,
        isGiftOpen,
        giftSong,
        currentLyricIndex,
        parsedLyrics,
        playSong,
        togglePlayPause,
        seek,
        setVolumeLevel,
        toggleMute,
        nextTrack,
        prevTrack,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleLyricModal,
        toggleQueueDrawer,
        openGiftModal,
        closeGiftModal,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
