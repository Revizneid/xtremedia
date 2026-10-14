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
  X,
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, isOpen = false, onClose }: SidebarProps) {
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className={`${styles.mobileOverlay} only-mobile-block`}
        />
      )}

      <aside
        className={`sidebar-desktop ${isOpen ? 'sidebar-open' : ''} ${styles.sidebar}`}
      >
        <div>
          {/* Brand Logo & Close Button */}
          <div className={styles.brandRow}>
            <div className={styles.brandColumn}>
              <div className={styles.brandLogo}>
                <Disc size={24} color="#FFF" />
              </div>
              <div>
                <h1 className={styles.brandTitle}>
                  Xtre<span className={styles.brandAccent}>Media</span>
                </h1>
                <span className={styles.brandTag}>
                  V2 Remaster
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className={`${styles.closeButton} only-mobile`}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Main Menu Navigation */}
          <div style={{ marginBottom: '28px' }}>
            <p className={styles.sectionLabel}>
              Menu Chính
            </p>
            <nav className={styles.menuList}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      if (onClose) onClose();
                    }}
                    className={`${styles.navButton} ${isActive ? styles.navButtonActive : styles.navButtonInactive}`}
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
          <p className={styles.sectionLabel}>
            Thư Viện & Tiện Ích
          </p>
          <nav className={styles.libraryList}>
            {libraryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) item.action();
                    else setCurrentTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`${styles.navButton} ${isActive ? styles.libraryButtonActive : styles.navButtonInactive}`}
                  style={{ fontWeight: isActive ? 600 : 500 }}
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
    </>
  );
}
