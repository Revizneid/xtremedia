'use client';

import React, { useState, useEffect } from 'react';
import {
  Music,
  Plus,
  Search,
  Edit2,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Song, Artist, Genre } from '@/lib/types';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genreName, setGenreName] = useState('Nhạc Trẻ V-Pop');
  const [albumTitle, setAlbumTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(210);
  const [bitrateKbps, setBitrateKbps] = useState(320);
  const [lyricsLrc, setLyricsLrc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudioPlayer();

  const fetchSongs = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/admin/songs${search ? `?q=${encodeURIComponent(search)}` : ''}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tải danh sách bài hát');
      }

      setSongs(Array.isArray(data.songs) ? data.songs : []);
    } catch (err) {
      console.error('Failed to fetch songs:', err);
      setFetchError(err instanceof Error ? err.message : 'Không thể tải danh sách bài hát');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [search]);

  const openAddModal = () => {
    setEditingSong(null);
    setTitle('');
    setArtistName('');
    setGenreName('Nhạc Trẻ V-Pop');
    setAlbumTitle('');
    setAudioUrl('');
    setCoverUrl('');
    setDurationSeconds(210);
    setBitrateKbps(320);
    setLyricsLrc(
      '[00:00.00] Tiêu đề bài hát\n[00:05.00] Lời mở đầu bài hát...\n[00:15.00] Giai điệu trầm ấm vang lên...'
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (song: Song) => {
    setEditingSong(song);
    setTitle(song.title);
    setArtistName(song.artistName);
    setGenreName(song.genreName || 'Nhạc Trẻ V-Pop');
    setAlbumTitle(song.albumTitle || '');
    setAudioUrl(song.audioUrl);
    setCoverUrl(song.coverUrl);
    setDurationSeconds(song.durationSeconds);
    setBitrateKbps(song.bitrateKbps);
    setLyricsLrc(song.lyricsLrc || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !artistName.trim() || !audioUrl.trim()) {
      setFormError('Vui lòng điền tiêu đề, ca sĩ và link âm thanh');
      return;
    }

    setSaving(true);
    try {
      if (editingSong) {
        const res = await fetch(`/api/admin/songs/${editingSong.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            title: title.trim(),
            artistName: artistName.trim(),
            genreName: genreName.trim(),
            albumTitle: albumTitle.trim() || null,
            audioUrl: audioUrl.trim(),
            coverUrl: coverUrl.trim(),
            durationSeconds: Number(durationSeconds),
            bitrateKbps: Number(bitrateKbps),
            lyricsLrc: lyricsLrc.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setIsModalOpen(false);
          fetchSongs();
        } else {
          setFormError(data.error || 'Cập nhật thất bại');
        }
      } else {
        const res = await fetch('/api/admin/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            title: title.trim(),
            artistName: artistName.trim(),
            genreName: genreName.trim(),
            albumTitle: albumTitle.trim() || null,
            audioUrl: audioUrl.trim(),
            coverUrl: coverUrl.trim(),
            durationSeconds: Number(durationSeconds),
            bitrateKbps: Number(bitrateKbps),
            lyricsLrc: lyricsLrc.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setIsModalOpen(false);
          fetchSongs();
        } else {
          setFormError(data.error || 'Thêm bài hát thất bại');
        }
      }
    } catch (err) {
      console.error('Save song error:', err);
      setFormError('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSong = async (songId: string, songTitle: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài hát "${songTitle}" khỏi kho nhạc không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/songs/${songId}`, { method: 'DELETE', cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        fetchSongs();
      } else {
        alert(data.error || 'Không thể xóa bài hát này');
      }
    } catch (err) {
      console.error('Delete song error:', err);
      alert('Không thể xóa bài hát này. Vui lòng thử lại.');
    }
  };

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 28%), #090d14' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Quản Lý Bài Hát
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Danh sách toàn bộ bài hát, chỉnh sửa metadata và đồng bộ lời Karaoke LRC.
          </p>
        </div>

        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent-gradient)',
            color: '#FFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Plus size={16} />
          <span>Thêm Bài Hát Mới</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '8px 16px',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Tìm bài hát theo tiêu đề hoặc ca sĩ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#FFF',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Tổng: <strong>{songs.length}</strong> bài hát
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '28px', borderRadius: '18px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.7)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Đang tải danh sách bài hát...
        </div>
      ) : fetchError ? (
        <div style={{ padding: '28px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(127, 30, 30, 0.12)', color: '#fecaca', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={18} />
            <strong>Không thể tải dữ liệu</strong>
          </div>
          <p style={{ margin: '0 0 16px', color: '#fecaca' }}>{fetchError}</p>
          <button
            onClick={() => void fetchSongs()}
            className="btn-secondary"
            style={{ margin: '0 auto' }}
          >
            Thử lại
          </button>
        </div>
      ) : songs.length === 0 ? (
        <div style={{ padding: '32px', borderRadius: '18px', border: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.7)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Music size={28} style={{ marginBottom: '10px', color: 'var(--accent-indigo)' }} />
          <h3 style={{ margin: '0 0 8px', color: '#FFF' }}>Chưa có bài hát nào phù hợp</h3>
          <p style={{ margin: '0 0 16px' }}>Hãy thêm bài hát mới hoặc đổi từ khóa tìm kiếm.</p>
          <button onClick={openAddModal} className="btn-primary">Thêm bài hát mới</button>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.2)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px', width: '50px' }}>Phát</th>
                <th style={{ padding: '14px 16px' }}>Tiêu Đề</th>
                <th style={{ padding: '14px 16px' }}>Ca Sĩ</th>
                <th style={{ padding: '14px 16px' }}>Thể Loại</th>
                <th style={{ padding: '14px 16px' }}>Chất Lượng</th>
                <th style={{ padding: '14px 16px' }}>Lượt Nghe</th>
                <th style={{ padding: '14px 16px' }}>LRC Karaoke</th>
                <th style={{ padding: '14px 16px' }}>Trạng Thái</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <tr
                    key={song.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => (isCurrent ? togglePlayPause() : playSong(song))}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: isCurrent ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.08)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {isCurrent && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={song.coverUrl}
                          alt=""
                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ color: '#FFF', fontWeight: 600 }}>{song.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {song.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{song.artistName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{song.genreName || 'Nhạc Trẻ'}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>
                      {song.bitrateKbps} kbps
                    </td>
                    <td style={{ padding: '12px 16px', color: '#FFF', fontWeight: 600 }}>
                      {song.playCount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {song.lyricsLrc ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <CheckCircle2 size={14} /> Có lời sync
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa có</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {song.isBroken ? (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Báo hỏng
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Sẵn sàng
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(song)}
                          title="Chỉnh sửa bài hát"
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSong(song.id, song.title)}
                          title="Xóa bài hát"
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Song Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0e131f',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFF', margin: '0 0 4px 0' }}>
                  {editingSong ? 'Chỉnh Sửa Bài Hát' : 'Thêm Bài Hát Mới'}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Nhập thông tin metadata và định dạng lời bài hát LRC.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveSong} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Tiêu đề bài hát *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Bước Qua Mùa Cô Đơn"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Ca sĩ / Nghệ sĩ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Vũ."
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Thể loại
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nhạc Trẻ V-Pop"
                    value={genreName}
                    onChange={(e) => setGenreName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Album (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Một Vạn Năm"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Liên kết file âm thanh (Audio URL / MP3 / OGG) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/audio.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Ảnh bìa (Cover Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Thời lượng (giây)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Bitrate (kbps)
                  </label>
                  <select
                    value={bitrateKbps}
                    onChange={(e) => setBitrateKbps(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: '#1a202c',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value={128}>128 kbps (Standard)</option>
                    <option value={256}>256 kbps (High Quality)</option>
                    <option value={320}>320 kbps (Lossless / Hi-Res)</option>
                  </select>
                </div>
              </div>

              {/* LRC Karaoke Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Lời bài hát Karaoke LRC (Định dạng [mm:ss.xx] Câu hát)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hỗ trợ tự động scroll trên Player</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="[00:00.00] Tiêu đề bài hát&#10;[00:15.00] Lời câu hát thứ nhất..."
                  value={lyricsLrc}
                  onChange={(e) => setLyricsLrc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#a5b4fc',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent-gradient)',
                    color: '#FFF',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Đang lưu...' : editingSong ? 'Lưu Thay Đổi' : 'Tạo Bài Hát Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
