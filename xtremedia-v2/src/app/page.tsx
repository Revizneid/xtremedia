'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import SongList from '@/components/SongList';
import { INITIAL_SONGS, INITIAL_ARTISTS, INITIAL_ALBUMS, INITIAL_GENRES } from '@/lib/mockData';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { Play, Disc, Mic2, Sparkles, Heart, Radio, ListMusic, Volume2 } from 'lucide-react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [songsList, setSongsList] = useState(INITIAL_SONGS);

  const { playSong } = useAudioPlayer();

  // Load persistent songs from API on mount
  React.useEffect(() => {
    fetch('/api/songs')
      .then((res) => res.json())
      .then((data) => {
        if (data.songs && data.songs.length > 0) {
          setSongsList(data.songs);
        }
      })
      .catch((err) => console.warn('Could not fetch songs from API, using defaults:', err));
  }, []);

  // Filter songs based on search and genre
  const filteredSongs = useMemo(() => {
    let list = [...songsList];

    if (selectedGenre) {
      list = list.filter((s) => s.genreId === selectedGenre);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.titleAscii.toLowerCase().includes(q) ||
          s.artistName.toLowerCase().includes(q)
      );
    }

    if (currentTab === 'top_plays') {
      list.sort((a, b) => b.playCount - a.playCount);
    } else if (currentTab === 'top_downloads') {
      list.sort((a, b) => b.downloadCount - a.downloadCount);
    }

    return list;
  }, [selectedGenre, searchQuery, currentTab]);

  const featuredSong = INITIAL_SONGS[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Fixed Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'calc(var(--player-height) + 32px)',
        }}
      >
        {/* Sticky Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          genres={INITIAL_GENRES}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
        />

        {/* Dynamic Page Views */}
        <div style={{ padding: '32px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {currentTab === 'discover' && (
            <>
              {/* Hero Banner for Featured Trending Track */}
              {!searchQuery && !selectedGenre && (
                <HeroBanner featuredSong={featuredSong} />
              )}

              {/* Albums Spotlight Carousel */}
              {!searchQuery && !selectedGenre && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div>
                      <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#FFF' }}>
                        Album & Đĩa Tuyển Chọn
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Những đĩa nhạc gắn liền với kỷ niệm XtreMedia và xu hướng mới
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                    {INITIAL_ALBUMS.map((album) => (
                      <div
                        key={album.id}
                        className="glass-card"
                        style={{ padding: '16px', cursor: 'pointer' }}
                        onClick={() => {
                          const albumSong = INITIAL_SONGS.find((s) => s.albumId === album.id);
                          if (albumSong) playSong(albumSong);
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '14px',
                          }}
                        >
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '10px',
                              right: '10px',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'var(--accent-gradient)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            }}
                          >
                            <Play size={18} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
                          </div>
                        </div>

                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                          {album.title}
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {album.artistName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Songs List */}
              <SongList
                songs={filteredSongs}
                title={
                  searchQuery
                    ? `Kết quả tìm kiếm cho "${searchQuery}"`
                    : selectedGenre
                    ? `Thể loại: ${INITIAL_GENRES.find((g) => g.id === selectedGenre)?.name}`
                    : 'Bài Hát Được Nghe Nhiều Nhất'
                }
                subtitle="Nhấn vào bài bất kỳ để kiểm thử Core Audio Player Engine và lời Karaoke"
              />

              {/* Artists Spotlight */}
              {!searchQuery && !selectedGenre && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#FFF', marginBottom: '18px' }}>
                    Nghệ Sĩ Nổi Bật
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                    {INITIAL_ARTISTS.map((artist) => (
                      <div
                        key={artist.id}
                        className="glass-card"
                        style={{ padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => {
                          const artistSong = INITIAL_SONGS.find((s) => s.artistId === artist.id);
                          if (artistSong) playSong(artistSong);
                        }}
                      >
                        <div
                          style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            margin: '0 auto 14px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <img
                            src={artist.avatarUrl}
                            alt={artist.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '4px' }}>
                          {artist.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {artist.country === 'VIETNAM' ? 'Việt Nam' : 'Quốc Tế'} • {(artist.viewCount / 1000).toFixed(0)}k lượt nghe
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {currentTab === 'top_plays' && (
            <SongList
              songs={filteredSongs}
              title="Bảng Xếp Hạng Nghe Nhiều Nhất (Top Plays)"
              subtitle="Cập nhật theo thời gian thực dựa trên lượt stream âm thanh"
            />
          )}

          {currentTab === 'top_downloads' && (
            <SongList
              songs={filteredSongs}
              title="Bảng Xếp Hạng Lượt Tải Xuống (Top Downloads)"
              subtitle="Những ca khúc được người yêu nhạc tải về nhiều nhất"
            />
          )}

          {currentTab === 'albums' && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>
                Bộ Sưu Tập Albums
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Tổng hợp các album tuyển tập chất lượng cao
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                {INITIAL_ALBUMS.map((album) => (
                  <div key={album.id} className="glass-card" style={{ padding: '20px' }}>
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      style={{ width: '100%', aspectRatio: '1', borderRadius: '14px', objectFit: 'cover', marginBottom: '16px' }}
                    />
                    <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>{album.title}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '8px' }}>{album.artistName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{album.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'artists' && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>
                Danh Sách Nghệ Sĩ
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Tất cả ca sĩ & ban nhạc trong hệ thống XtreMedia
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                {INITIAL_ARTISTS.map((artist) => (
                  <div key={artist.id} className="glass-card" style={{ padding: '24px 18px', textAlign: 'center' }}>
                    <img
                      src={artist.avatarUrl}
                      alt={artist.name}
                      style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }}
                    />
                    <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#FFF', marginBottom: '6px' }}>{artist.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{artist.bio}</p>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                      {(artist.viewCount / 1000).toFixed(0)}k lượt quan tâm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'my_playlist' && (
            <div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>
                Playlist Cá Nhân Của Bạn
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Đã khắc phục hoàn toàn lỗi ghi đè playlist tập trung của bản 1.2
              </p>
              <SongList
                songs={INITIAL_SONGS.slice(0, 3)}
                title="Bài Hát Đã Lưu Gần Đây"
                subtitle="Danh sách bài hát yêu thích của tài khoản thành viên"
              />
            </div>
          )}

          {currentTab === 'radio' && (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
              <Radio size={56} color="var(--accent-rose)" style={{ margin: '0 auto 20px' }} />
              <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#FFF', marginBottom: '12px' }}>
                XtreMedia 2000s Live Wave
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '28px' }}>
                Kênh phát thanh trực tuyến tổng hợp những giai điệu vàng thời kỳ hoàng kim của làng nhạc Việt.
              </p>
              <button
                className="btn-primary"
                onClick={() => playSong(INITIAL_SONGS[1])}
                style={{ margin: '0 auto', padding: '14px 36px', fontSize: '16px' }}
              >
                <Volume2 size={20} />
                <span>Bật Kênh Radio Ngay</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
