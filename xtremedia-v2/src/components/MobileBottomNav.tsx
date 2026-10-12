'use client';

import React from 'react';
import { Home, Flame, Gift, ListMusic, Menu } from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenMenu: () => void;
}

export default function MobileBottomNav({
  currentTab,
  setCurrentTab,
  onOpenMenu,
}: MobileBottomNavProps) {
  const { openGiftModal } = useAudioPlayer();

  const navItems = [
    { id: 'discover', label: 'Khám Phá', icon: Home, action: () => setCurrentTab('discover') },
    { id: 'top_plays', label: 'BXH', icon: Flame, action: () => setCurrentTab('top_plays') },
    { id: 'gift', label: 'Quà Tặng', icon: Gift, action: () => openGiftModal() },
    { id: 'my_playlist', label: 'Playlist', icon: ListMusic, action: () => setCurrentTab('my_playlist') },
    { id: 'menu', label: 'Thêm', icon: Menu, action: onOpenMenu },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={item.action}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              color: isActive ? 'var(--accent-indigo)' : 'var(--text-muted)',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.2s ease',
            }}
          >
            <Icon size={20} color={isActive ? 'var(--accent-indigo)' : 'currentColor'} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
