'use client';

import React from 'react';
import { Play, Flame, Heart, Share2, Sparkles } from 'lucide-react';
import { Song } from '@/lib/types';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface HeroBannerProps {
  featuredSong: Song;
}

export default function HeroBanner({ featuredSong }: HeroBannerProps) {
  const { playSong, currentSong, isPlaying, togglePlayPause, openGiftModal } = useAudioPlayer();
  const isCurrentActive = currentSong?.id === featuredSong.id;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        padding: '36px',
        minHeight: '260px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: `linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(236, 72, 153, 0.3) 100%), url(${featuredSong.coverUrl}) center/cover no-repeat`,
        boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7)',
        marginBottom: '36px',
      }}
    >
      {/* Dark overlay with blur effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(8, 11, 17, 0.95) 20%, rgba(8, 11, 17, 0.7) 60%, rgba(8, 11, 17, 0.4) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(236, 72, 153, 0.25)',
              border: '1px solid var(--accent-rose)',
              color: '#FFF',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            <Flame size={14} color="var(--accent-rose)" />
            Top Thịnh Hành Tháng
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            • {featuredSong.genreName || 'V-Pop'}
          </span>
        </div>

        <h2
          style={{
            fontSize: '34px',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '8px',
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {featuredSong.title}
        </h2>

        <p style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 500 }}>
          Trình bày: <span style={{ color: '#FFF', fontWeight: 600 }}>{featuredSong.artistName}</span>
          {featuredSong.albumTitle ? ` • Album: ${featuredSong.albumTitle}` : ''}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={() => {
              if (isCurrentActive) {
                togglePlayPause();
              } else {
                playSong(featuredSong);
              }
            }}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            <Play size={18} fill="#FFF" />
            <span>{isCurrentActive && isPlaying ? 'Tạm Dừng' : 'Phát Ngay'}</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => openGiftModal(featuredSong)}
          >
            <Share2 size={16} />
            <span>Gửi Tặng Bài Này</span>
          </button>
        </div>
      </div>

      {/* Artwork with Rotating Glow Vinyl */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="hero-art-container"
      >
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <img
            src={featuredSong.coverUrl}
            alt={featuredSong.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </div>
  );
}
