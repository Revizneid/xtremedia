'use client';

import React, { useEffect, useState } from 'react';
import { Disc3, Plus, Trash2, X } from 'lucide-react';
import { Artist, Album } from '@/lib/types';

export default function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const [albumsRes, artistsRes] = await Promise.all([
        fetch('/api/admin/albums'),
        fetch('/api/admin/artists'),
      ]);

      if (albumsRes.ok) {
        const albumsData = await albumsRes.json();
        setAlbums(albumsData.albums || []);
      }

      if (artistsRes.ok) {
        const artistsData = await artistsRes.json();
        setArtists(artistsData.artists || []);
        if (!artistId && artistsData.artists?.[0]?.id) {
          setArtistId(artistsData.artists[0].id);
        }
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

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistId) return;

    const res = await fetch('/api/admin/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        artistId,
        coverUrl: coverUrl.trim() || undefined,
        description: description.trim() || undefined,
      }),
    });

    if (res.ok) {
      setTitle('');
      setCoverUrl('');
      setDescription('');
      setIsModalOpen(false);
      fetchAlbums();
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!window.confirm('Xóa album này?')) return;
    const res = await fetch(`/api/admin/albums?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchAlbums();
    }
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0' }}>Quản Lý Album</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Theo dõi, tạo mới và quản lý bộ sưu tập nhạc cho ứng dụng.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
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
            <div key={album.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden' }}>
              <img src={album.coverUrl} alt={album.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', margin: 0 }}>{album.title}</h3>
                  <button onClick={() => handleDeleteAlbum(album.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>{album.artistName || 'Unknown Artist'}</div>
                <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>{album.description || 'Không có mô tả'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,12,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ width: '100%', maxWidth: '500px', background: '#0e131f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: '#FFF', margin: 0, fontSize: '18px', fontWeight: 700 }}>Tạo Album Mới</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                Lưu Album
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
