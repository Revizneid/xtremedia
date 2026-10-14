'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Save, Image as ImageIcon } from 'lucide-react';

interface HeroConfig {
  enabled: boolean;
  songId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  backgroundImage: string | null;
  updatedAt?: string;
}

interface SongOption {
  id: string;
  title: string;
  artistName: string;
}

export default function AdminHeroPage() {
  const [config, setConfig] = useState<HeroConfig | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hero', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || null);
        setSongs(data.songs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        alert('Cập nhật Hero Banner thành công!');
      } else {
        const error = await res.json();
        alert(error.error || 'Lỗi cập nhật Hero Banner');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div style={{ padding: '32px 40px', color: 'var(--text-secondary)' }}>Đang tải cấu hình Hero Banner...</div>;
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0' }}>Quản Lý Hero Banner</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Chọn bài hát nổi bật hiển thị trên trang chủ và tùy chỉnh nội dung banner.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFF' }}>
            <Sparkles size={18} color="var(--accent-indigo)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Thiết lập banner</h2>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Bài hát nổi bật</label>
            <select value={config.songId || ''} onChange={(e) => setConfig({ ...config, songId: e.target.value || null })} style={{ width: '100%', borderRadius: '10px', background: '#0b1220', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px', colorScheme: 'dark', appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #d1d5db 50%), linear-gradient(135deg, #d1d5db 50%, transparent 50%)', backgroundPosition: 'calc(100% - 18px) calc(1.1em + 2px), calc(100% - 12px) calc(1.1em + 2px)', backgroundSize: '6px 6px, 6px 6px', backgroundRepeat: 'no-repeat' }}>
              <option value="">Chọn bài hát</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>{song.title} • {song.artistName}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tiêu đề banner</label>
            <input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Phụ đề</label>
            <input value={config.subtitle} onChange={(e) => setConfig({ ...config, subtitle: e.target.value })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Nhãn nút</label>
            <input value={config.ctaLabel} onChange={(e) => setConfig({ ...config, ctaLabel: e.target.value })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Background image URL</label>
            <input value={config.backgroundImage || ''} onChange={(e) => setConfig({ ...config, backgroundImage: e.target.value || null })} placeholder="https://..." style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFF' }}>
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
            <span>Hiển thị banner trên trang chủ</span>
          </label>

          <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'var(--accent-gradient)', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            <Save size={16} />
            <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
          </button>
        </form>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFF' }}>
            <ImageIcon size={18} color="var(--accent-rose)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Preview</h2>
          </div>

          <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', minHeight: '240px', background: config.backgroundImage ? `linear-gradient(135deg, rgba(99,102,241,0.4), rgba(236,72,153,0.3)), url(${config.backgroundImage}) center/cover` : 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(236,72,153,0.35))' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8, 11, 17, 0.9), rgba(8,11,17,0.5))' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '999px', background: 'rgba(236,72,153,0.25)', border: '1px solid rgba(236,72,153,0.4)', color: '#FFF', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{config.title}</div>
              <h3 style={{ marginTop: '14px', fontSize: '28px', fontWeight: 800, color: '#FFF' }}>{config.title}</h3>
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '15px' }}>{config.subtitle}</p>
              <button style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '999px', border: 'none', background: 'var(--accent-gradient)', color: '#FFF', fontWeight: 700 }}>{config.ctaLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
