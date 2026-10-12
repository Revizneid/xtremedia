'use client';

import React, { useState, useEffect } from 'react';
import { Mic2, Plus, Trash2, Globe, Tag, Sparkles, X } from 'lucide-react';
import { Artist, Genre } from '@/lib/types';

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  // Artist modal state
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [artistAvatar, setArtistAvatar] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistCountry, setArtistCountry] = useState<'VIETNAM' | 'INTERNATIONAL'>('VIETNAM');

  const fetchArtistsAndGenres = async () => {
    setLoading(true);
    try {
      const [resAr, resGe] = await Promise.all([
        fetch('/api/admin/artists'),
        fetch('/api/genres'),
      ]);
      if (resAr.ok) {
        const dataAr = await resAr.json();
        setArtists(dataAr.artists || []);
      }
      if (resGe.ok) {
        const dataGe = await resGe.json();
        setGenres(dataGe.genres || []);
      }
    } catch (err) {
      console.error('Fetch artists error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtistsAndGenres();
  }, []);

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistName.trim()) return;

    try {
      const res = await fetch('/api/admin/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: artistName.trim(),
          avatarUrl: artistAvatar.trim() || undefined,
          bio: artistBio.trim() || undefined,
          country: artistCountry,
        }),
      });
      if (res.ok) {
        setIsArtistModalOpen(false);
        setArtistName('');
        setArtistAvatar('');
        setArtistBio('');
        fetchArtistsAndGenres();
      }
    } catch (err) {
      console.error('Create artist error:', err);
    }
  };

  const handleDeleteArtist = async (id: string, name: string) => {
    if (!window.confirm(`Xóa nghệ sĩ "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/artists?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchArtistsAndGenres();
      }
    } catch (err) {
      console.error('Delete artist error:', err);
    }
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Quản Lý Ca Sĩ & Danh Mục
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Danh sách các nghệ sĩ biểu diễn và cây danh mục thể loại âm nhạc.
          </p>
        </div>

        <button
          onClick={() => setIsArtistModalOpen(true)}
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
          <span>Thêm Nghệ Sĩ Mới</span>
        </button>
      </div>

      {/* Artists Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>
          Danh Sách Ca Sĩ ({artists.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {artists.map((artist) => (
            <div
              key={artist.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <img
                src={artist.avatarUrl}
                alt={artist.name}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  margin: '0 auto 12px auto',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}
              />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                {artist.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {artist.country === 'VIETNAM' ? '🇻🇳 Việt Nam' : '🌍 Quốc tế'}
              </div>
              <button
                onClick={() => handleDeleteArtist(artist.id, artist.name)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Genres List */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>
          Thể Loại Âm Nhạc ({genres.length})
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {genres.map((g) => (
            <div
              key={g.id}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#FFF',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Tag size={13} color="var(--accent-indigo)" />
              <span>{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Artist Modal */}
      {isArtistModalOpen && (
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
          onClick={() => setIsArtistModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#0e131f',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: 0 }}>Thêm Nghệ Sĩ Mới</h3>
              <button
                onClick={() => setIsArtistModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateArtist} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Tên ca sĩ / nghệ sĩ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đan Trường"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Link ảnh đại diện (Avatar URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={artistAvatar}
                  onChange={(e) => setArtistAvatar(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Khu vực / Quốc gia
                </label>
                <select
                  value={artistCountry}
                  onChange={(e) => setArtistCountry(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#1a202c',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                  }}
                >
                  <option value="VIETNAM">🇻🇳 Việt Nam</option>
                  <option value="INTERNATIONAL">🌍 Quốc Tế</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Tạo Nghệ Sĩ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
