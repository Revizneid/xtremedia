'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Music,
  Play,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Disc3,
  Mic2,
  RefreshCw,
  Plus,
} from 'lucide-react';

interface StatsData {
  totalSongs: number;
  totalArtists: number;
  totalAlbums: number;
  totalGenres: number;
  totalUsers: number;
  brokenSongsCount: number;
  totalPlays: number;
  totalDownloads: number;
  topSongs: Array<{
    id: string;
    title: string;
    artistName: string;
    genreName?: string;
    playCount: number;
    downloadCount: number;
    isBroken: boolean;
  }>;
  recentBrokenSongs: Array<{
    id: string;
    title: string;
    artistName: string;
    audioUrl: string;
  }>;
  syncSummary?: {
    total: number;
    success: number;
    reused: number;
    failed: number;
    hasSynced: boolean;
    lastSyncStatus: 'SUCCESS' | 'REUSED' | 'FAILED' | 'NEVER';
    lastSyncAt: string | null;
    recent: Array<{
      id: string;
      status: string;
      createdAt: string;
      payloadHash: string;
    }>;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Bảng Điều Khiển Tổng Quan
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Trung tâm giám sát kho nhạc, lượt nghe và trạng thái hệ thống XtreMedia V2.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchStats}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm Mới</span>
          </button>

          <Link
            href="/admin/songs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--accent-gradient)',
              color: '#FFF',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Thêm Bài Hát Mới</span>
          </Link>
        </div>
      </div>

      {/* Urgent Broken Link Warning Banner */}
      {stats && stats.brokenSongsCount > 0 && (
        <div
          style={{
            marginBottom: '28px',
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5' }}>
                Phát hiện {stats.brokenSongsCount} bài hát bị người dùng báo lỗi link hỏng!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Người nghe không thể stream các bài này. Vui lòng kiểm tra và cập nhật URL âm thanh mới.
              </div>
            </div>
          </div>

          <Link
            href="/admin/broken"
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#ef4444',
              color: '#FFF',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Xử Lý Ngay →
          </Link>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Card 1: Total Songs */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Kho Bài Hát</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Music size={18} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFF' }}>
            {stats ? stats.totalSongs.toLocaleString() : '...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Gồm {stats?.totalArtists || 0} ca sĩ & {stats?.totalGenres || 0} thể loại
          </div>
        </div>

        {/* Card 2: Total Plays */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Tổng Lượt Phát</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.15)',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={18} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFF' }}>
            {stats ? stats.totalPlays.toLocaleString() : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span>{stats?.totalDownloads.toLocaleString() || 0} lượt tải về</span>
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Thành Viên Hệ Thống</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFF' }}>
            {stats ? stats.totalUsers.toLocaleString() : '...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Quản trị viên & người nghe nhạc
          </div>
        </div>

        {/* Card 4: Broken Songs Status */}
        <div
          style={{
            background:
              stats && stats.brokenSongsCount > 0
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(255, 255, 255, 0.03)',
            border:
              stats && stats.brokenSongsCount > 0
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Báo Link Hỏng</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background:
                  stats && stats.brokenSongsCount > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                color: stats && stats.brokenSongsCount > 0 ? '#ef4444' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: stats && stats.brokenSongsCount > 0 ? '#ef4444' : '#10b981',
            }}
          >
            {stats ? stats.brokenSongsCount : '0'}
          </div>
          <div style={{ fontSize: '12px', color: stats && stats.brokenSongsCount > 0 ? '#f87171' : '#10b981' }}>
            {stats && stats.brokenSongsCount > 0 ? 'Cần khắc phục gấp' : 'Tất cả link đang hoạt động tốt'}
          </div>
        </div>
      </div>

      {stats?.syncSummary && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: '0 0 4px 0' }}>Studio Sync Status</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {stats.syncSummary.hasSynced
                  ? `Dữ liệu từ Studio đã đồng bộ lần cuối: ${new Date(stats.syncSummary.lastSyncAt!).toLocaleString('vi-VN')} (${stats.syncSummary.lastSyncStatus})`
                  : 'Chưa có dữ liệu nào từ Studio được đồng bộ. Hệ thống đang chờ lần sync đầu tiên.'}
              </p>
            </div>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                color: stats.syncSummary.hasSynced ? '#10b981' : '#f59e0b',
                background: stats.syncSummary.hasSynced ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${stats.syncSummary.hasSynced ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
              }}
            >
              {stats.syncSummary.hasSynced ? 'Synced' : 'Awaiting Sync'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            {[
              { label: 'Success', value: stats.syncSummary.success, tone: '#10b981' },
              { label: 'Reused', value: stats.syncSummary.reused, tone: '#8b5cf6' },
              { label: 'Failed', value: stats.syncSummary.failed, tone: '#ef4444' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{item.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: item.tone, marginTop: '8px' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {stats.syncSummary.recent.length > 0 ? (
              stats.syncSummary.recent.map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ color: '#FFF', fontWeight: 600, fontSize: '13px' }}>{log.status}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{new Date(log.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{log.payloadHash.slice(0, 12)}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d', fontSize: '13px' }}>
                Chưa có log đồng bộ nào được ghi lại. Hãy kích hoạt lần sync đầu tiên từ XtreMedia Studio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Played Songs Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '20px',
          padding: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: '0 0 4px 0' }}>
              Top Bài Hát Nghe Nhiều Nhất
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Bài hát thu hút nhiều lượt nghe và tương tác nhất trên nền tảng.
            </p>
          </div>

          <Link
            href="/admin/songs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent-indigo)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Xem tất cả</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>#</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tên Bài Hát</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ca Sĩ</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Thể Loại</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Lượt Nghe</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topSongs.map((song, idx) => (
                <tr
                  key={song.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '16px', color: '#FFF', fontWeight: 600 }}>
                    {song.title}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                    {song.artistName}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                    {song.genreName || 'Nhạc Trẻ'}
                  </td>
                  <td style={{ padding: '16px', color: '#FFF', fontWeight: 700 }}>
                    {song.playCount.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px' }}>
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
                        Hoạt động
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
