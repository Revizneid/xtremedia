'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Mic2, 
  ListMusic, 
  Heart,
  Share2
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    queue,
    togglePlayPause,
    seek,
    setVolumeLevel,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    toggleLyricModal,
    toggleQueueDrawer,
    isLyricOpen,
    isQueueOpen,
    openGiftModal,
  } = useAudioPlayer();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--player-height)',
        zIndex: 50,
        background: 'rgba(10, 14, 23, 0.92)',
        backdropFilter: 'var(--glass-blur)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Left: Track Information */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px', maxWidth: '320px' }}>
        {/* Vinyl Album Art */}
        <div
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            flexShrink: 0,
          }}
          className={`animate-spin-slow ${!isPlaying ? 'paused' : ''}`}
        >
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Vinyl Center Hole */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#0B0E14',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          />
        </div>

        <div style={{ overflow: 'hidden' }}>
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#FFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentSong.title}
          </h4>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '2px',
            }}
          >
            {currentSong.artistName}
          </p>
        </div>

        <button
          className="btn-icon"
          title="Tặng bài hát này"
          onClick={() => openGiftModal(currentSong)}
          style={{ width: '32px', height: '32px', flexShrink: 0 }}
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Center: Controls & Seekbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: '620px',
        }}
      >
        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            className={`btn-icon ${isShuffle ? 'btn-icon-active' : ''}`}
            onClick={toggleShuffle}
            title={isShuffle ? 'Tắt phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
          >
            <Shuffle size={16} />
          </button>

          <button className="btn-icon" onClick={prevTrack} title="Bài trước">
            <SkipBack size={19} />
          </button>

          {/* Central Play/Pause Big Glowing Button */}
          <button
            onClick={togglePlayPause}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(99, 102, 241, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(99, 102, 241, 0.45)';
            }}
          >
            {isPlaying ? (
              <Pause size={20} fill="#FFF" color="#FFF" />
            ) : (
              <Play size={20} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button className="btn-icon" onClick={nextTrack} title="Bài tiếp">
            <SkipForward size={19} />
          </button>

          <button
            className={`btn-icon ${repeatMode !== 'off' ? 'btn-icon-active' : ''}`}
            onClick={toggleRepeat}
            title={`Lặp lại: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '35px', textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>

          <div
            style={{
              position: 'relative',
              flex: 1,
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              seek(ratio * duration);
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progressPercent}%`,
                background: 'var(--accent-gradient)',
                borderRadius: '9999px',
              }}
            />
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '35px' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Karaoke Lyric & Queue & Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', justifyContent: 'flex-end' }}>
        <button
          className={`btn-icon ${isLyricOpen ? 'btn-icon-active' : ''}`}
          onClick={toggleLyricModal}
          title="Lời bài hát Karaoke"
          style={{ position: 'relative' }}
        >
          <Mic2 size={19} />
          {currentSong.lyricsLrc && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-rose)',
              }}
            />
          )}
        </button>

        <button
          className={`btn-icon ${isQueueOpen ? 'btn-icon-active' : ''}`}
          onClick={toggleQueueDrawer}
          title="Danh sách phát tiếp theo"
          style={{ position: 'relative' }}
        >
          <ListMusic size={19} />
          {queue.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                fontSize: '10px',
                fontWeight: 700,
                background: 'var(--accent-indigo)',
                color: '#FFF',
                borderRadius: '9999px',
                padding: '1px 5px',
              }}
            >
              {queue.length}
            </span>
          )}
        </button>

        {/* Volume Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-icon" onClick={toggleMute} style={{ width: '32px', height: '32px' }}>
            {isMuted || volume === 0 ? (
              <VolumeX size={17} />
            ) : volume < 0.5 ? (
              <Volume1 size={17} />
            ) : (
              <Volume2 size={17} />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            style={{
              width: '80px',
              height: '4px',
              accentColor: 'var(--accent-indigo)',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
}
