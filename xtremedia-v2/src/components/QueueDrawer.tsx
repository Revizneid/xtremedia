'use client';

import React from 'react';
import { X, Trash2, Play, Music, ListMusic } from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

export default function QueueDrawer() {
  const {
    queue,
    queueIndex,
    isQueueOpen,
    toggleQueueDrawer,
    playSong,
    removeFromQueue,
    clearQueue,
  } = useAudioPlayer();

  if (!isQueueOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 'var(--player-height)',
        width: '360px',
        zIndex: 55,
        background: 'rgba(10, 14, 23, 0.95)',
        backdropFilter: 'var(--glass-blur)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={20} color="var(--accent-indigo)" />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#FFF' }}>Danh Sách Phát</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({queue.length})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {queue.length > 0 && (
            <button
              className="btn-icon"
              title="Xóa toàn bộ hàng đợi"
              onClick={clearQueue}
              style={{ width: '32px', height: '32px' }}
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            className="btn-icon"
            onClick={toggleQueueDrawer}
            style={{ width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p>Hàng đợi phát nhạc đang trống.</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Chọn bài hát và nhấn nút (+) để thêm vào danh sách.</p>
          </div>
        ) : (
          queue.map((song, idx) => {
            const isPlayingThis = idx === queueIndex;

            return (
              <div
                key={`${song.id}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: isPlayingThis ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  border: isPlayingThis ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => playSong(song)}
                onMouseEnter={(e) => {
                  if (!isPlayingThis) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isPlayingThis) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isPlayingThis ? 'var(--accent-indigo)' : '#FFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.title}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.artistName}
                    </p>
                  </div>
                </div>

                <button
                  className="btn-icon"
                  title="Xóa khỏi danh sách"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(idx);
                  }}
                  style={{ width: '28px', height: '28px' }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
