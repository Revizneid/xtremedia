'use client';

import React, { useEffect, useRef } from 'react';
import { X, Mic2, Disc, Play } from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

export default function LyricModal() {
  const {
    currentSong,
    isLyricOpen,
    toggleLyricModal,
    parsedLyrics,
    currentLyricIndex,
    seek,
  } = useAudioPlayer();

  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  // Auto-scroll active lyric into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLyricIndex]);

  if (!isLyricOpen || !currentSong) return null;

  return (
    <div
      className="lyric-modal-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(8, 11, 17, 0.96)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 48px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(236, 72, 153, 0.2)',
              border: '1px solid var(--accent-rose)',
              color: 'var(--accent-rose)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Mic2 size={15} />
            <span>Karaoke Realtime Synchronizer</span>
          </div>
          <span className="hide-mobile" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Nhấn vào bất kỳ câu nào để nhảy tới đoạn đó
          </span>
        </div>

        <button
          className="btn-icon"
          onClick={toggleLyricModal}
          style={{ width: '42px', height: '42px', background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <X size={22} color="#FFF" />
        </button>
      </div>

      {/* Mini Mobile Track Header */}
      <div className="only-mobile" style={{ alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
        <img
          src={currentSong.coverUrl}
          alt={currentSong.title}
          style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ overflow: 'hidden' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentSong.title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--accent-rose)', marginTop: '2px' }}>
            {currentSong.artistName}
          </p>
        </div>
      </div>

      {/* Main Content: Left Art & Right Lyrics */}
      <div
        className="lyric-modal-layout"
        style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '60px', height: 'calc(100% - 70px)', alignItems: 'center' }}
      >
        {/* Left: Huge Vinyl & Info */}
        <div
          className="lyric-modal-art"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
        >
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '280px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 40px rgba(99, 102, 241, 0.3)',
              marginBottom: '28px',
              border: '2px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
            {currentSong.title}
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--accent-rose)', fontWeight: 600 }}>
            {currentSong.artistName}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {currentSong.albumTitle ? `Album: ${currentSong.albumTitle}` : 'Đơn ca'}
          </p>
        </div>

        {/* Right: Scrolling Lyrics */}
        <div
          className="touch-scroll"
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '20px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {parsedLyrics.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>Chưa có lời bài hát đồng bộ.</p>
              <p style={{ fontSize: '14px' }}>Bài hát này đang phát âm thanh không lời hoặc chưa cập nhật lời.</p>
            </div>
          ) : (
            parsedLyrics.map((line, idx) => {
              const isActive = idx === currentLyricIndex;
              const isPast = idx < currentLyricIndex;

              return (
                <p
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seek(line.time)}
                  className={`lyric-text-line ${isActive ? 'active' : ''}`}
                  style={{
                    fontSize: isActive ? '28px' : '20px',
                    fontWeight: isActive ? 800 : 500,
                    lineHeight: 1.4,
                    color: isActive
                      ? '#FFFFFF'
                      : isPast
                      ? 'rgba(255, 255, 255, 0.4)'
                      : 'rgba(255, 255, 255, 0.25)',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: 'left center',
                    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    textShadow: isActive ? '0 0 25px rgba(236, 72, 153, 0.7)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#FFF';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = isPast
                        ? 'rgba(255, 255, 255, 0.4)'
                        : 'rgba(255, 255, 255, 0.25)';
                    }
                  }}
                >
                  {line.text}
                </p>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
