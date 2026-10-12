'use client';

import React, { useState } from 'react';
import { X, Gift, Send, CheckCircle2, Music, Copy } from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

export default function GiftModal() {
  const { isGiftOpen, closeGiftModal, giftSong } = useAudioPlayer();

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('Chúc bạn nghe nhạc vui vẻ cùng XtreMedia V2!');
  const [isSent, setIsSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  if (!isGiftOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !recipientName || !recipientEmail) {
      alert('Vui lòng điền đủ thông tin người gửi và người nhận.');
      return;
    }

    const code = 'XM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    setIsSent(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    alert('Đã sao chép mã quà tặng: ' + generatedCode);
  };

  const resetForm = () => {
    setIsSent(false);
    setSenderName('');
    setRecipientName('');
    setRecipientEmail('');
    closeGiftModal();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        background: 'rgba(8, 11, 17, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(14, 20, 32, 0.95)',
          border: '1px solid var(--border-highlight)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.25)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          className="btn-icon"
          onClick={resetForm}
          style={{ position: 'absolute', right: '20px', top: '20px' }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={20} color="#FFF" />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>
              Quà Tặng Âm Nhạc
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Tính năng biểu tượng của XtreMedia thập niên 2000
            </p>
          </div>
        </div>

        {giftSong && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.05)',
              marginBottom: '20px',
            }}
          >
            <img
              src={giftSong.coverUrl}
              alt={giftSong.title}
              style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
            />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{giftSong.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{giftSong.artistName}</p>
            </div>
          </div>
        )}

        {isSent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={56} color="var(--accent-emerald)" style={{ margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
              Đã Gửi Quà Tặng Thành Công!
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Email kèm link bài hát đã được gửi tới <b>{recipientEmail}</b>.
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px dashed var(--accent-indigo)',
                marginBottom: '24px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mã quà tặng:</span>
              <strong style={{ fontSize: '16px', color: '#FFF', letterSpacing: '1px' }}>
                {generatedCode}
              </strong>
              <button
                className="btn-icon"
                onClick={handleCopy}
                title="Sao chép mã"
                style={{ width: '28px', height: '28px' }}
              >
                <Copy size={14} />
              </button>
            </div>

            <div>
              <button className="btn-primary" onClick={resetForm} style={{ width: '100%', justifyContent: 'center' }}>
                Hoàn Tất
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tên của bạn *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Họ tên bạn"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Email của bạn
                </label>
                <input
                  type="email"
                  placeholder="email@vidu.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tên người nhận *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Tên bạn bè / người yêu"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Email người nhận *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nguoinhan@vidu.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Lời nhắn gửi gắm
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#FFF',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ justifyContent: 'center', marginTop: '8px' }}
            >
              <Send size={16} />
              <span>Gửi Quà Tặng Ngay</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
