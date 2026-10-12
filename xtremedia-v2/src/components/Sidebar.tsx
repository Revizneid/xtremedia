'use client';

import React from 'react';
import { 
  Home, 
  Flame, 
  TrendingUp, 
  Disc, 
  Mic2, 
  Gift, 
  ListMusic, 
  Radio, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const { openGiftModal } = useAudioPlayer();

  const menuItems = [
    { id: 'discover', label: 'Khám Phá', icon: Home },
    { id: 'top_plays', label: 'BXH Nghe Nhiều', icon: Flame },
    { id: 'top_downloads', label: 'BXH Tải Xuống', icon: TrendingUp },
    { id: 'albums', label: 'Albums Nổi Bật', icon: Disc },
    { id: 'artists', label: 'Nghệ Sĩ / Ca Sĩ', icon: Mic2 },
  ];

  const libraryItems = [
    { id: 'my_playlist', label: 'Playlist Của Tôi', icon: ListMusic },
    { id: 'gifts', label: 'Quà Tặng Âm Nhạc', icon: Gift, action: () => openGiftModal() },
    { id: 'radio', label: 'Live Radio 2000s', icon: Radio },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 40,
        borderRight: '1px solid var(--border-subtle)',
        background: 'rgba(8, 11, 17, 0.85)',
        backdropFilter: 'var(--glass-blur)',
      }}
    >
      <div>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px', marginBottom: '32px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Disc size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#FFF' }}>
              Xtre<span style={{ color: 'var(--accent-rose)' }}>Media</span>
            </h1>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-indigo)',
                padding: '2px 6px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              V2 Remaster
            </span>
          </div>
        </div>

        {/* Main Menu Navigation */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', padding: '0 10px', marginBottom: '10px', letterSpacing: '0.8px' }}>
            Menu Chính
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? 'var(--accent-gradient)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#FFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Library Navigation */}
        <div>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', padding: '0 10px', marginBottom: '10px', letterSpacing: '0.8px' }}>
            Thư Viện & Tiện Ích
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) item.action();
                    else setCurrentTab(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#FFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent';
                    e.currentTarget.style.color = isActive ? 'var(--accent-indigo)' : 'var(--text-secondary)';
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Retro Tribute & Admin CP Footer */}
      <div
        style={{
          padding: '16px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <ShieldCheck size={16} color="var(--accent-emerald)" />
          <span>Admin CP & API Ready</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Tribute to <b>RedPhoenix89</b> & Vietnam Music Portal 2006–2008.
        </p>
      </div>
    </aside>
  );
}
