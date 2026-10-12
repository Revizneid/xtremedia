'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, User, Mail, Sparkles, LogIn, UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, openAuthModal, login, register } = useAuth();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!identifier.trim() || !password) {
      setErrorMessage('Vui lòng nhập tài khoản và mật khẩu');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regUsername.trim()) {
      setErrorMessage('Vui lòng nhập tên tài khoản');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Địa chỉ email không hợp lệ');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không trùng khớp');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      username: regUsername.trim(),
      email: regEmail.trim(),
      password: regPassword,
      displayName: regDisplayName.trim() || regUsername.trim(),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Đăng ký không thành công');
    }
  };

  const fillQuickCredentials = (userVal: string, passVal: string) => {
    setIdentifier(userVal);
    setPassword(passVal);
    setErrorMessage(null);
  };

  return (
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
          padding: '16px',
        }}
        onClick={closeAuthModal}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'linear-gradient(135deg, rgba(20, 26, 40, 0.95), rgba(12, 16, 24, 0.98))',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Glow Accent Header */}
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #ec4899, #06b6d4)',
            width: '100%',
          }}
        />

        {/* Modal Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFF';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={18} />
        </button>

        {/* Header Tabs */}
        <div style={{ padding: '32px 32px 16px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Sparkles size={20} color="#FFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFF' }}>
                {authModalTab === 'login' ? 'Đăng Nhập XtreMedia' : 'Đăng Ký Tài Khoản'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {authModalTab === 'login'
                  ? 'Thưởng thức nhạc không giới hạn cùng kho thư viện V2'
                  : 'Gia nhập cộng đồng âm nhạc trực tuyến thế hệ mới'}
              </p>
            </div>
          </div>

          {/* Switch Tab Buttons */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '4px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                openAuthModal('login');
                setErrorMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: authModalTab === 'login' ? 'var(--accent-indigo)' : 'transparent',
                color: authModalTab === 'login' ? '#FFF' : 'var(--text-secondary)',
                fontWeight: authModalTab === 'login' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <LogIn size={15} />
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                openAuthModal('register');
                setErrorMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: authModalTab === 'register' ? 'var(--accent-indigo)' : 'transparent',
                color: authModalTab === 'register' ? '#FFF' : 'var(--text-secondary)',
                fontWeight: authModalTab === 'register' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <UserPlus size={15} />
              Đăng Ký
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 32px 32px 32px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {authModalTab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tên tài khoản hoặc Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="admin hoặc email..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mật khẩu</label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Quên mật khẩu?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Quick Fill Demo Badges */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#6366f1" />
                  <span>Tài khoản kiểm thử nhanh (Click để điền tự động):</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('admin', 'admin123')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    👑 Quản trị viên (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('member', 'member123')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#6ee7b7',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    🎧 Thành viên (member)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Tên tài khoản (viết liền, không dấu)
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: musicfan2026"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Địa chỉ Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Tên hiển thị (Nickname)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hoàng Long Âm Nhạc"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Mật khẩu (≥ 6 ký tự)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Nhập lại mật khẩu
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFF',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Đang khởi tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
