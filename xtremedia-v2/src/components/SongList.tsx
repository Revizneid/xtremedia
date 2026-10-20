'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Gift, 
  Download, 
  AlertTriangle, 
  Check, 
  Music, 
  Flame 
} from 'lucide-react';
import { Song } from '@/lib/types';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface SongListProps {
  songs: Song[];
  title?: string;
  subtitle?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function SongList({ songs, title = 'Danh Sách Bài Hát', subtitle }: SongListProps) {
  const { 
    currentSong, 
    isPlaying, 
    playSong, 
    togglePlayPause, 
    addToQueue, 
    openGiftModal 
  } = useAudioPlayer();

  const handleReportBroken = async (songId: string, songTitle: string) => {
    if (confirm(`Bạn muốn báo link bài hát "${songTitle}" bị hỏng?`)) {
      try {
        const res = await fetch(`/api/songs/${songId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'report_broken' }),
        });
        const data = await res.json();
        alert(data.message || 'Đã thông báo thành công cho quản trị viên!');
      } catch (err) {
        alert('Có lỗi xảy ra, vui lòng thử lại.');
      }
    }
  };

  const handleDownload = (song: Song) => {
    fetch(`/api/songs/${song.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download' }),
    }).catch(() => {});

    // Open audio url in new tab or trigger download
    window.open(song.audioUrl, '_blank');
  };

  const handleSongSelection = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlayPause();
      return;
    }

    playSong(song, songs);
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#FFF' }}>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {songs.length} bài hát
        </span>
      </div>

      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'rgba(14, 20, 32, 0.65)',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'var(--glass-blur)',
        }}
      >
        {/* Table Header */}
        <div
          className="song-table-header"
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 180px 120px 80px 140px',
            padding: '12px 18px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
            letterSpacing: '0.5px',
          }}
        >
          <span>#</span>
          <span>Bài Hát & Nghệ Sĩ</span>
          <span>Album</span>
          <span style={{ textAlign: 'right' }}>Lượt Nghe</span>
          <span style={{ textAlign: 'right' }}>Thời Lượng</span>
          <span style={{ textAlign: 'center' }}>Thao Tác</span>
        </div>

        {/* Rows */}
        {songs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Không tìm thấy bài hát nào phù hợp.
          </div>
        ) : (
          songs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            const isCurrentPlaying = isCurrent && isPlaying;

            return (
              <div
                key={song.id}
                className="song-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 180px 120px 80px 140px',
                  alignItems: 'center',
                  padding: '12px 18px',
                  fontSize: '14px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  background: isCurrent ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer',
                }}
                role="button"
                tabIndex={0}
                onClick={() => handleSongSelection(song)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSongSelection(song);
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Number / Equalizer */}
                <div style={{ display: 'flex', alignItems: 'center', width: '28px' }}>
                  {isCurrentPlaying ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                      <span className="equalizer-bar" />
                    </div>
                  ) : (
                    <span style={{ color: isCurrent ? 'var(--accent-indigo)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Song Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSongSelection(song);
                    }}
                  >
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isCurrent ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.opacity = '0';
                      }}
                    >
                      {isCurrentPlaying ? (
                        <Pause size={18} color="#FFF" />
                      ) : (
                        <Play size={18} fill="#FFF" color="#FFF" />
                      )}
                    </div>
                  </div>

                  <div style={{ overflow: 'hidden' }}>
                    <p
                      style={{
                        fontWeight: 600,
                        color: isCurrent ? 'var(--accent-indigo)' : '#FFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongSelection(song);
                      }}
                    >
                      {song.title}
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongSelection(song);
                      }}
                    >
                      {song.artistName}
                    </p>
                  </div>
                </div>

                {/* Album */}
                <div className="song-row-album" style={{ color: 'var(--text-muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.albumTitle || 'Đơn ca'}
                </div>

                {/* Play Count */}
                <div className="song-row-plays" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {song.playCount.toLocaleString('vi-VN')}
                </div>

                {/* Duration */}
                <div className="song-row-duration" style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {formatDuration(song.durationSeconds)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <button
                    className="btn-icon"
                    title="Thêm vào danh sách chờ"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(song);
                    }}
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    className="btn-icon"
                    title="Tặng bài hát này (Gift)"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGiftModal(song);
                    }}
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Gift size={16} />
                  </button>

                  <button
                    className="btn-icon hide-mobile"
                    title="Tải bài hát"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(song);
                    }}
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Download size={16} />
                  </button>

                  <button
                    className="btn-icon hide-mobile"
                    title="Báo link hỏng"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportBroken(song.id, song.title);
                    }}
                    style={{ width: '32px', height: '32px' }}
                  >
                    <AlertTriangle size={15} color={song.isBroken ? 'red' : 'currentColor'} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
