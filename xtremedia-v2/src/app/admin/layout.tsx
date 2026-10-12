'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Music,
  AlertTriangle,
  Mic2,
  Users,
  Home,
  ShieldCheck,
  LogOut,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Tổng Quan', href: '/admin', icon: LayoutDashboard },
    { label: 'Quản Lý Bài Hát', href: '/admin/songs', icon: Music },
    { label: 'Báo Link Hỏng', href: '/admin/broken', icon: AlertTriangle, badge: 'Cần duyệt' },
    { label: 'Ca Sĩ & Thể Loại', href: '/admin/artists', icon: Mic2 },
    { label: 'Thành Viên & RBAC', href: '/admin/users', icon: Users },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: '#FFF',
          fontSize: '16px',
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles className="spin" size={24} color="var(--accent-indigo)" />
          <span>Đang xác thực quyền Quản trị viên...</span>
        </div>
      </div>
    );
  }

  // Not logged in or not ADMIN/MODERATOR
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #080b11 70%)',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(15, 20, 30, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '24px',
            padding: '36px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#ef4444',
            }}
          >
            <ShieldCheck size={36} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>
            Quyền Truy Cập Bị Giới Hạn
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Khu vực Quản Trị Hệ Thống (Admin Control Panel) chỉ dành riêng cho tài khoản có vai trò{' '}
            <strong style={{ color: '#f59e0b' }}>ADMIN</strong> hoặc{' '}
            <strong style={{ color: '#06b6d4' }}>MODERATOR</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => openAuthModal('login')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--accent-gradient)',
                color: '#FFF',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              Đăng Nhập Tài Khoản Admin
            </button>

            <Link
              href="/"
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Home size={16} />
              <span>Quay về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Admin Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'rgba(11, 15, 25, 0.95)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}
            >
              <ShieldCheck size={20} color="#FFF" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', letterSpacing: '-0.3px' }}>
                Admin<span style={{ color: 'var(--accent-rose)' }}>CP</span> V2
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>XtreMedia Management</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '8px 12px', textTransform: 'uppercase' }}>
            Quản Trị Hệ Thống
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  color: isActive ? '#FFF' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={17} color={isActive ? 'var(--accent-indigo)' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.href === '/admin/broken' && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontWeight: 600,
                    }}
                  >
                    Lọc
                  </span>
                )}
              </Link>
            );
          })}

          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '16px 12px 8px 12px', textTransform: 'uppercase' }}>
            Điều Hướng
          </div>

          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '12px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            <Home size={17} />
            <span>Về Trang Nghe Nhạc</span>
            <ExternalLink size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />
          </Link>
        </nav>

        {/* Current Admin User Info */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: '#FFF',
              }}
            >
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName || user.username}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: user.role === 'ADMIN' ? '#f59e0b' : '#06b6d4',
                  textTransform: 'uppercase',
                }}
              >
                👑 {user.role}
              </span>
            </div>
            <button
              onClick={() => logout()}
              title="Đăng xuất"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: '90px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
