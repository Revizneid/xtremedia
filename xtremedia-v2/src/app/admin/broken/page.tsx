'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Song } from '@/lib/types';

export default function AdminBrokenSongsPage() {
  const [brokenSongs, setBrokenSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrls, setNewUrls] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchBrokenSongs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/broken');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBrokenSongs(data.brokenSongs);
        }
      }
    } catch (err) {
      console.error('Failed to fetch broken songs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrokenSongs();
  }, []);

  const handleFixSong = async (songId: string) => {
    const replacementUrl = newUrls[songId];
    try {
      const res = await fetch('/api/admin/broken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, newAudioUrl: replacementUrl || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(data.message);
        fetchBrokenSongs();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error || 'Khắc phục link thất bại');
      }
    } catch (err) {
      console.error('Fix broken link error:', err);
    }
  };

  const handleDeleteSong = async (songId: string, songTitle: string) => {
    if (!window.confirm(`Xóa bài hát "${songTitle}" khỏi hệ thống?`)) return;

    try {
      const res = await fetch(`/api/admin/songs/${songId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBrokenSongs();
      }
    } catch (err) {
      console.error('Delete broken song error:', err);
    }
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Xử Lý Báo Link Hỏng
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Danh sách bài hát được người nghe báo lỗi nguồn phát audio. Cập nhật URL mới để kích hoạt lại bài hát.
          </p>
        </div>

        <button
          onClick={fetchBrokenSongs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Làm Mới</span>
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Zero Broken State */}
      {brokenSongs.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#10b981',
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: '0 0 6px 0' }}>
            Không có bài hát nào bị báo link hỏng!
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Toàn bộ các bản nhạc trên hệ thống XtreMedia V2 đang phát ổn định.
          </p>
        </div>
      ) : (
        /* List of Broken Songs */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {brokenSongs.map((song) => (
            <div
              key={song.id}
              style={{
                background: 'rgba(20, 24, 35, 0.7)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={song.coverUrl}
                    alt=""
                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{song.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Ca sĩ: <strong style={{ color: 'var(--text-secondary)' }}>{song.artistName}</strong> • Thể loại: {song.genreName}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteSong(song.id, song.title)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Xóa Bài</span>
                  </button>
                </div>
              </div>

              {/* Current URL & Replacement Input */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#f87171" />
                  <span>URL hiện tại bị báo lỗi:</span>
                  <a
                    href={song.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#f87171', textDecoration: 'underline', wordBreak: 'break-all' }}
                  >
                    {song.audioUrl}
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder="Dán link audio mới tại đây (hoặc để trống nếu link đã hoạt động lại)..."
                    value={newUrls[song.id] || ''}
                    onChange={(e) => setNewUrls({ ...newUrls, [song.id]: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleFixSong(song.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'var(--accent-gradient)',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Wrench size={15} />
                    <span>Khắc Phục & Mở Lại</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
