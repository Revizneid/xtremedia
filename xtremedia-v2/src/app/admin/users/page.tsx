'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, UserCheck, RefreshCw, Sparkles } from 'lucide-react';
import { apiFetchJson } from '@/lib/apiFetchJson';
import { SafeUser, Role } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<{ users?: SafeUser[] }>('/api/admin/users', { cache: 'no-store' });
      setUsers(data?.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingId(userId);
    try {
      const data = await apiFetchJson<{ success?: boolean; error?: string }>('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (data?.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error('Update role error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Quản Trị Thành Viên & Phân Quyền RBAC
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Quản lý danh sách thành viên và phân quyền truy cập hệ thống (ADMIN, MODERATOR, USER).
          </p>
        </div>

        <button
          onClick={fetchUsers}
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
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 16px' }}>Thành Viên</th>
              <th style={{ padding: '14px 16px' }}>Email</th>
              <th style={{ padding: '14px 16px' }}>Ngày Tham Gia</th>
              <th style={{ padding: '14px 16px' }}>Vai Trò Hiện Tại</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Thay Đổi Phân Quyền</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.2s',
                }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                      }}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        user.username.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#FFF', fontWeight: 600 }}>{user.displayName || user.username}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{user.email}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background:
                        user.role === 'ADMIN'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : user.role === 'MODERATOR'
                          ? 'rgba(6, 182, 212, 0.15)'
                          : 'rgba(99, 102, 241, 0.15)',
                      color:
                        user.role === 'ADMIN'
                          ? '#f59e0b'
                          : user.role === 'MODERATOR'
                          ? '#06b6d4'
                          : '#a5b4fc',
                      border:
                        user.role === 'ADMIN'
                          ? '1px solid rgba(245, 158, 11, 0.3)'
                          : user.role === 'MODERATOR'
                          ? '1px solid rgba(6, 182, 212, 0.3)'
                          : '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <select
                    disabled={updatingId === user.id}
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#1a202c',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '12px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="USER">USER (Thành viên)</option>
                    <option value="MODERATOR">MODERATOR (Kiểm duyệt)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
