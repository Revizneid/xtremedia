'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Bell, User, Music, ChevronDown, LogOut, ShieldCheck, Menu } from 'lucide-react';
import { Genre } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  genres: Genre[];
  selectedGenre: string | null;
  setSelectedGenre: (id: string | null) => void;
  onToggleSidebar?: () => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  genres,
  selectedGenre,
  setSelectedGenre,
  onToggleSidebar,
}: HeaderProps) {
  const { user, openAuthModal, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  return (
    <header
      className="header-container"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(8, 11, 17, 0.75)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Mobile Hamburger Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="only-mobile"
            aria-label="Mở menu điều hướng"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={22} />
          </button>
        )}

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '480px', flex: 1 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Tìm bài hát, ca sĩ, album..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 44px',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#FFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-indigo)';
              e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              e.target.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-subtle)';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Right Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div
            className="hide-mobile"
            style={{
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '9999px',
              background: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              color: 'var(--accent-rose)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Sparkles size={15} />
            <span>XtreMedia Engine 2026</span>
          </div>

          <button className="btn-icon hide-mobile">
            <Bell size={18} />
          </button>

          {user ? (
            /* Logged in User Pill with Dropdown */
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 12px 4px 6px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#FFF',
                  }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    user.username.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', lineHeight: 1.2 }}>
                    {user.displayName || user.username}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: user.role === 'ADMIN' ? '#f59e0b' : user.role === 'MODERATOR' ? '#06b6d4' : '#a5b4fc',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {user.role}
                  </span>
                </div>

                <ChevronDown size={14} color="var(--text-muted)" />
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '220px',
                    background: 'rgba(15, 20, 30, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '8px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đăng nhập với tài khoản</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>@{user.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{user.email}</div>
                  </div>

                  {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                    <Link
                      href="/admin"
                      onClick={() => setShowDropdown(false)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        color: '#f59e0b',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s',
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>Quản Trị AdminCP</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={15} />
                    <span>Đăng Xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Logged out Action Buttons */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => openAuthModal('login')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#FFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                Đăng Nhập
              </button>
              <button
                onClick={() => openAuthModal('register')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#FFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(236, 72, 153, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(99, 102, 241, 0.3)';
                }}
              >
                Đăng Ký
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div
        className="no-scrollbar touch-scroll"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}
      >
        <button
          onClick={() => setSelectedGenre(null)}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '13px',
            fontWeight: selectedGenre === null ? 600 : 500,
            background: selectedGenre === null ? '#FFF' : 'rgba(255, 255, 255, 0.06)',
            color: selectedGenre === null ? '#0B0E14' : 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          Tất cả thể loại
        </button>

        {genres.map((g) => {
          const isSelected = selectedGenre === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(isSelected ? null : g.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: isSelected ? 600 : 500,
                background: isSelected ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.06)',
                color: isSelected ? '#FFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#FFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {g.name}
            </button>
          );
        })}
      </div>
    </header>
  );
}
