'use client';

import React, { useEffect, useState } from 'react';
import { Disc3, Plus, Trash2, X, Pencil, Music4, ListMusic } from 'lucide-react';
import { apiFetchJson } from '@/lib/apiFetchJson';
import { Artist, Album, Song } from '@/lib/types';

type AdminAlbum = Album & {
  songCount: number;
  songs: Song[];
};

export default function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<AdminAlbum[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');

  const resetAlbumForm = () => {
    setEditingAlbum(null);
    setTitle('');
    setArtistId('');
    setCoverUrl('');
    setDescription('');
  };

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const [albumsData, artistsData] = await Promise.all([
        apiFetchJson<{ albums?: any[] }>('/api/admin/albums', { cache: 'no-store' }),
        apiFetchJson<{ artists?: Artist[] }>('/api/admin/artists', { cache: 'no-store' }),
      ]);

      setAlbums(
        (albumsData?.albums || []).map((album: any) => ({
          ...album,
          songCount: album.songCount ?? album.songs?.length ?? 0,
          songs: album.songs || [],
        }))
      );

      setArtists(artistsData?.artists || []);
      if (!artistId && artistsData?.artists?.[0]?.id) {
        setArtistId(artistsData.artists[0].id);
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const openCreateAlbumModal = () => {
    resetAlbumForm();
    if (artists[0]?.id) {
      setArtistId(artists[0].id);
    }
    setIsModalOpen(true);
  };

  const openEditAlbumModal = (album: Album) => {
    setEditingAlbum(album);
    setTitle(album.title);
    setArtistId(album.artistId);
    setCoverUrl(album.coverUrl || '');
    setDescription(album.description || '');
    setIsModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistId) return;

    const payload = {
      title: title.trim(),
      artistId,
      coverUrl: coverUrl.trim() || undefined,
      description: description.trim() || undefined,
    };

    const data = await apiFetchJson<{ success?: boolean; error?: string }>(editingAlbum ? `/api/admin/albums/${editingAlbum.id}` : '/api/admin/albums', {
      method: editingAlbum ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    if (data?.success) {
      resetAlbumForm();
      setIsModalOpen(false);
      fetchAlbums();
    } else {
      alert(data?.error || 'Không thể lưu album.');
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!window.confirm('Xóa album này?')) return;

    const data = await apiFetchJson<{ success?: boolean; error?: string }>(`/api/admin/albums?id=${id}`, { method: 'DELETE', cache: 'no-store' });

    if (data?.success) {
      fetchAlbums();
    } else {
      alert(data?.error || 'Không thể xóa album.');
    }
  };

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 30%), #090d14' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0' }}>Quản Lý Album</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Theo dõi, tạo mới và quản lý bộ sưu tập nhạc cho ứng dụng.</p>
        </div>

        <button
          onClick={openCreateAlbumModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent-gradient)',
            color: '#FFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          <span>Thêm Album</span>
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Đang tải album...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px' }}>
          {albums.map((album) => (
            <div key={album.id} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)' }}>
              <img src={album.coverUrl} alt={album.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', margin: 0 }}>{album.title}</h3>
                </div>
                <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>{album.artistName || 'Unknown Artist'}</div>
                <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>{album.description || 'Không có mô tả'}</p>

                <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ListMusic size={14} />
                      Bài hát liên quan
                    </span>
                    <span>{album.songCount}</span>
                  </div>

                  {album.songs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {album.songs.map((song) => (
                        <div key={song.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: '#dfe7ff', fontSize: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <Music4 size={12} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</span>
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{song.durationSeconds ? `${Math.floor(song.durationSeconds / 60)}:${String(song.durationSeconds % 60).padStart(2, '0')}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa có bài hát nào trong album.</div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
                  <button onClick={() => openEditAlbumModal(album)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#dfe7ff', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}>
                    <Pencil size={14} /> Sửa
                  </button>
                  <button onClick={() => handleDeleteAlbum(album.id)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer' }}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,12,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: '#FFF', margin: 0, fontSize: '18px', fontWeight: 700 }}>{editingAlbum ? 'Chỉnh Sửa Album' : 'Tạo Album Mới'}</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAlbum} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tên album *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Nghệ sĩ *</label>
                <select value={artistId} onChange={(e) => setArtistId(e.target.value)} required style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }}>
                  <option value="">Chọn nghệ sĩ</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Cover URL</label>
                <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Mô tả</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', resize: 'vertical', padding: '10px 12px' }} />
              </div>

              <button type="submit" style={{ border: 'none', borderRadius: '12px', background: 'var(--accent-gradient)', color: '#FFF', fontWeight: 700, padding: '12px 18px', cursor: 'pointer' }}>
                {editingAlbum ? 'Cập Nhật Album' : 'Lưu Album'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
