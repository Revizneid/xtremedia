'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Pencil, Plus, RefreshCw, Save, Sparkles, Trash2, XCircle } from 'lucide-react';
import { apiFetchJson } from '@/lib/apiFetchJson';
import { type HeroAdminConfig, type HeroAdminRecord, resolveHeroAdminViewState, shouldShowHeroEmptyState } from './heroAdminState';

interface HeroConfig extends HeroAdminConfig {}

interface HeroBannerRecord extends HeroAdminRecord {}

interface SongOption {
  id: string;
  title: string;
  artistName: string;
}

interface HeroPageResponse {
  success?: boolean;
  records?: HeroBannerRecord[];
  active?: HeroBannerRecord[];
  config?: HeroConfig | null;
  songs?: SongOption[];
  message?: string;
  error?: string;
}

interface HeroDraft {
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  songId: string;
  sortOrder: number;
  isActive: boolean;
}

const makeDraft = (): HeroDraft => ({
  title: 'Top Thịnh Hành Tháng',
  subtitle: 'XtreMedia Engine 2026',
  imageUrl: '',
  linkUrl: '',
  songId: '',
  sortOrder: 0,
  isActive: true,
});

async function fetchHeroJson<T>(url: string, init: RequestInit = {}): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    return await apiFetchJson<T>(url, { ...init, signal: controller.signal, credentials: 'same-origin' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new Error('Máy chủ không phản hồi trong 15 giây. Vui lòng thử lại.');
      (timeoutError as Error & { status?: number }).status = 408;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function AdminHeroPage() {
  const [records, setRecords] = useState<HeroBannerRecord[]>([]);
  const [active, setActive] = useState<HeroBannerRecord[]>([]);
  const [config, setConfig] = useState<HeroConfig | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HeroDraft>(makeDraft());
  const [saving, setSaving] = useState(false);

  const viewState = resolveHeroAdminViewState({ loading, error: errorMessage, records, config });
  const activeCount = active.length;

  const loadHeroData = async () => {
    setLoading(true);
    setErrorMessage(null);
    setErrorId(null);
    setNotice(null);

    try {
      const data = await fetchHeroJson<HeroPageResponse>('/api/admin/hero', { method: 'GET', cache: 'no-store' });
      if (!data) {
        throw new Error('Máy chủ trả về dữ liệu rỗng.');
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
      setActive(Array.isArray(data.active) ? data.active : []);
      setConfig(data.config ?? null);
      setSongs(Array.isArray(data.songs) ? data.songs : []);
      setNotice(null);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu Hero Banner';
      setErrorMessage(nextMessage);
      setErrorId((error as Error & { errorId?: string | null })?.errorId ?? null);
      setRecords([]);
      setActive([]);
      setConfig(null);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHeroData();
  }, []);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingId(null);
    setDraft(makeDraft());
    setIsFormOpen(true);
    setNotice(null);
  };

  const openEditForm = (record: HeroBannerRecord) => {
    setFormMode('edit');
    setEditingId(record.id);
    setDraft({
      title: record.title || 'Top Thịnh Hành Tháng',
      subtitle: record.subtitle || '',
      imageUrl: record.imageUrl || '',
      linkUrl: record.linkUrl || '',
      songId: record.songId || '',
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setIsFormOpen(true);
    setNotice(null);
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const payload = {
        id: editingId || undefined,
        title: draft.title.trim() || 'Top Thịnh Hành Tháng',
        subtitle: draft.subtitle.trim() || null,
        imageUrl: draft.imageUrl.trim() || null,
        linkUrl: draft.linkUrl.trim() || null,
        songId: draft.songId.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      };

      const response = await fetchHeroJson<HeroPageResponse>(`/api/admin/hero`, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      const responseData = response as HeroPageResponse | null;
      if (!responseData?.success) {
        throw new Error(responseData?.error || (formMode === 'create' ? 'Không thể tạo banner.' : 'Không thể cập nhật banner.'));
      }

      setNotice({ kind: 'success', text: responseData.message || (formMode === 'create' ? 'Hero banner đã được tạo thành công.' : 'Hero banner đã được cập nhật thành công.') });
      setIsFormOpen(false);
      setEditingId(null);
      setDraft(makeDraft());
      await loadHeroData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu Hero Banner';
      setNotice({ kind: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Bạn có chắc muốn xoá banner này?');
    if (!confirmed) return;

    try {
      const response = await fetchHeroJson<{ success?: boolean; message?: string; error?: string }>(`/api/admin/hero?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Không thể xoá banner.');
      }

      setNotice({ kind: 'success', text: response.message || 'Banner đã được xoá.' });
      await loadHeroData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xoá banner';
      setNotice({ kind: 'error', text: message });
    }
  };

  const handleToggleActive = async (record: HeroBannerRecord) => {
    try {
      const response = await fetchHeroJson<{ success?: boolean; message?: string; error?: string }>(`/api/admin/hero`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: record.id, isActive: !record.isActive }),
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Không thể bật/tắt banner.');
      }

      setNotice({ kind: 'success', text: response.message || 'Trạng thái banner đã được cập nhật.' });
      await loadHeroData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể bật/tắt banner';
      setNotice({ kind: 'error', text: message });
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= records.length) return;

    const reordered = [...records];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    try {
      for (const [itemIndex, item] of reordered.entries()) {
        await fetchHeroJson<{ success?: boolean; message?: string; error?: string }>(`/api/admin/hero`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ id: item.id, sortOrder: itemIndex }),
        });
      }

      setNotice({ kind: 'success', text: 'Thứ tự banner đã được cập nhật.' });
      await loadHeroData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đổi thứ tự banner';
      setNotice({ kind: 'error', text: message });
    }
  };

  const renderEmptyState = () => (
    <div style={{ padding: '32px 24px', border: '1px solid var(--border-subtle)', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', width: '56px', height: '56px', borderRadius: '16px', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)', color: '#c7d2fe', fontSize: '24px' }}>
        <Sparkles size={24} />
      </div>
      <h2 style={{ margin: '18px 0 10px', color: '#FFF', fontSize: '24px' }}>Chưa có banner nào</h2>
      <p style={{ margin: '0 auto 20px', maxWidth: '420px', color: 'var(--text-secondary)' }}>Tạo banner đầu tiên để hiển thị bài hát nổi bật trên trang chủ.</p>
      {config && (
        <div style={{ marginBottom: '18px', color: 'var(--text-secondary)', fontSize: '12px' }}>Dữ liệu cũ: cấu hình legacy được giữ lại để tương thích, nhưng trang đang ưu tiên danh sách banner hiện tại.</div>
      )}
      <button type="button" onClick={openCreateForm} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'var(--accent-gradient)', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
        <Plus size={16} />
        <span>Thêm banner</span>
      </button>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleFormSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFF' }}>
          <Sparkles size={18} color="var(--accent-indigo)" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{formMode === 'create' ? 'Thêm banner mới' : 'Sửa banner'}</h2>
        </div>
        <button type="button" onClick={() => setIsFormOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: '#FFF', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}>
          Đóng
        </button>
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Bài hát</label>
        <select value={draft.songId} onChange={(event) => setDraft({ ...draft, songId: event.target.value })} style={{ width: '100%', borderRadius: '10px', background: '#0b1220', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }}>
          <option value="">Chọn bài hát</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title} • {song.artistName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tiêu đề</label>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Phụ đề</label>
        <input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ảnh HTTPS</label>
        <input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://..." style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Liên kết</label>
        <input value={draft.linkUrl} onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })} placeholder="https://... hoặc /" style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Thứ tự</label>
          <input type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value || 0) })} style={{ width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: '#FFF', padding: '10px 12px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', paddingBottom: '4px' }}>
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          <span style={{ color: '#FFF' }}>Bật banner</span>
        </div>
      </div>

      <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px', border: 'none', background: 'var(--accent-gradient)', color: '#FFF', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
        <Save size={16} />
        <span>{saving ? 'Đang lưu...' : formMode === 'create' ? 'Tạo banner' : 'Lưu thay đổi'}</span>
      </button>
    </form>
  );

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0' }}>Quản Lý Hero Banner</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Danh sách và quản lý banner hiển thị trên trang chủ. {activeCount} đang bật.</p>
        </div>

        {viewState === 'ready' && records.length > 0 && (
          <button type="button" onClick={openCreateForm} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: 'var(--accent-gradient)', border: 'none', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} />
            <span>Thêm banner</span>
          </button>
        )}
      </div>

      {notice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${notice.kind === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, background: notice.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: notice.kind === 'success' ? '#bbf7d0' : '#fecaca' }}>
          {notice.kind === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      {errorMessage && viewState === 'error' && (
        <div style={{ marginBottom: '16px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fecaca' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Không thể tải dữ liệu Hero Banner</div>
          <div>{errorMessage}</div>
          {errorId && <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>Mã lỗi: {errorId}</div>}
          <button type="button" onClick={() => void loadHeroData()} style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'transparent', color: '#FFF', cursor: 'pointer' }}>
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {viewState === 'loading' && (
        <div style={{ padding: '32px 40px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu Hero Banner...</div>
      )}

      {viewState === 'ready' && (
        <>
          {shouldShowHeroEmptyState({ records, config }) ? renderEmptyState() : null}

          {!shouldShowHeroEmptyState({ records, config }) && !isFormOpen && records.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {records.map((record, index) => (
                <div key={record.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '18px', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: '84px', height: '84px', borderRadius: '14px', background: record.imageUrl ? `url(${record.imageUrl}) center/cover` : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(236,72,153,0.35))', border: '1px solid var(--border-subtle)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: '#FFF', fontSize: '18px' }}>{record.title}</h3>
                        {record.isActive && (
                          <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '999px', background: 'rgba(34,197,94,0.15)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}>
                            Đang bật
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>{record.subtitle || 'Không có phụ đề'}</p>
                      <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {record.song ? `Bài hát: ${record.song.title}` : 'Chưa gán bài hát'} • Thứ tự: {record.sortOrder}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => handleToggleActive(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: '#FFF', cursor: 'pointer' }}>
                        {record.isActive ? 'Tắt' : 'Bật'}
                      </button>
                      <button type="button" onClick={() => openEditForm(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: '#FFF', cursor: 'pointer' }}>
                        <Pencil size={14} />
                        Sửa
                      </button>
                      <button type="button" onClick={() => void handleDelete(record.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.35)', background: 'transparent', color: '#fecaca', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                        Xoá
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" disabled={index === 0} onClick={() => void handleMove(record.id, 'up')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: '#FFF', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}>
                        <ArrowUp size={14} />
                        Lên
                      </button>
                      <button type="button" disabled={index === records.length - 1} onClick={() => void handleMove(record.id, 'down')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: '#FFF', cursor: index === records.length - 1 ? 'not-allowed' : 'pointer', opacity: index === records.length - 1 ? 0.5 : 1 }}>
                        <ArrowDown size={14} />
                        Xuống
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isFormOpen && (
            <div style={{ marginTop: '20px' }}>
              {renderForm()}
            </div>
          )}
        </>
      )}

      {viewState === 'ready' && records.length === 0 && !isFormOpen && (
        <div style={{ marginTop: '18px' }}>
          <button type="button" onClick={openCreateForm} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: 'var(--accent-gradient)', border: 'none', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} />
            <span>Thêm banner</span>
          </button>
        </div>
      )}
    </div>
  );
}
