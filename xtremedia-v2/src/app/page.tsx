'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import SongList from '@/components/SongList';
import MobileBottomNav from '@/components/MobileBottomNav';
import { INITIAL_SONGS, INITIAL_ARTISTS, INITIAL_ALBUMS, INITIAL_GENRES } from '@/lib/mockData';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { Play, Pause, Disc, Mic2, Sparkles, Heart, Radio, ListMusic, Volume2 } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [songsList, setSongsList] = useState(INITIAL_SONGS);
  const [featuredSong, setFeaturedSong] = useState(INITIAL_SONGS[0]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { playSong, currentSong, isPlaying, togglePlayPause } = useAudioPlayer();
  const activeSongPool = songsList.length > 0 ? songsList : INITIAL_SONGS;

  // Load persistent songs and featured banner config from API on mount
  React.useEffect(() => {
    Promise.all([
      fetch('/api/songs', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/hero', { cache: 'no-store' }).then((res) => res.json()),
    ])
      .then(([songsData, heroData]) => {
        const songs = songsData.songs || [];
        if (songs.length > 0) {
          setSongsList(songs);
          const heroSong = heroData?.config?.songId
            ? songs.find((song: any) => song.id === heroData.config.songId)
            : null;
          setFeaturedSong(heroSong || songs[0] || INITIAL_SONGS[0]);
        }

        if (heroData?.config?.songId && songsData.songs?.length) {
          const matchedSong = songsData.songs.find((song: any) => song.id === heroData.config.songId);
          if (matchedSong) {
            setFeaturedSong(matchedSong);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch songs from API, using defaults:', err));
  }, []);

  // Filter songs based on search and genre
  const filteredSongs = useMemo(() => {
    let list = [...activeSongPool];

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
  }, [activeSongPool, selectedGenre, searchQuery, currentTab]);

  return (
    <div className={styles.pageShell}>
      {/* Fixed / Mobile Drawer Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className={`${styles.mainContent} main-content-layout`}>
        {/* Sticky Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          genres={INITIAL_GENRES}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Page Views */}
        <div className={`${styles.contentPadding} content-padding`}>
          {currentTab === 'discover' && (
            <>
              {/* Hero Banner for Featured Trending Track */}
              {!searchQuery && !selectedGenre && (
                <HeroBanner featuredSong={featuredSong} />
              )}

              {/* Albums Spotlight Carousel */}
              {!searchQuery && !selectedGenre && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h3 className={styles.sectionTitle}>
                        Album & Đĩa Tuyển Chọn
                      </h3>
                      <p className={styles.sectionSubtitle}>
                        Những đĩa nhạc gắn liền với kỷ niệm XtreMedia và xu hướng mới
                      </p>
                    </div>
                  </div>

                  <div className={styles.albumGrid}>
                    {INITIAL_ALBUMS.map((album) => {
                      const albumSong = activeSongPool.find((s) => s.albumId === album.id) || activeSongPool[0];
                      const isAlbumCurrent = currentSong?.id === albumSong?.id;
                      const isAlbumPlaying = isAlbumCurrent && isPlaying;

                      return (
                        <div
                          key={album.id}
                          className={`glass-card ${styles.albumCard}`}
                          onClick={() => {
                            if (!albumSong) return;
                            if (isAlbumCurrent) {
                              togglePlayPause();
                            } else {
                              playSong(albumSong, activeSongPool);
                            }
                          }}
                        >
                          <div className={styles.albumCoverWrap}>
                            <img
                              src={album.coverUrl}
                              alt={album.title}
                              className={styles.albumCover}
                            />
                            <div className={styles.albumPlayButton}>
                              {isAlbumPlaying ? (
                                <Pause size={18} fill="#FFF" color="#FFF" />
                              ) : (
                                <Play size={18} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
                              )}
                            </div>
                          </div>

                          <h4 className={styles.albumTitle}>
                            {album.title}
                          </h4>
                          <p className={styles.albumMeta}>
                            {album.artistName}
                          </p>
                        </div>
                      );
                    })}
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
                  <h3 className={styles.sectionTitle} style={{ marginBottom: '18px' }}>
                    Nghệ Sĩ Nổi Bật
                  </h3>
                  <div className={styles.artistGrid}>
                    {INITIAL_ARTISTS.map((artist) => (
                      <div
                        key={artist.id}
                        className={`glass-card ${styles.artistCard}`}
                        onClick={() => {
                          const artistSong = activeSongPool.find((s) => s.artistId === artist.id) || activeSongPool[0];
                          if (artistSong) playSong(artistSong, activeSongPool);
                        }}
                      >
                        <div className={styles.artistAvatarWrap}>
                          <img
                            src={artist.avatarUrl}
                            alt={artist.name}
                            className={styles.artistAvatar}
                          />
                        </div>
                        <h4 className={styles.artistName}>
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
              <h3 className={styles.tabTitle}>
                Bộ Sưu Tập Albums
              </h3>
              <p className={styles.tabSubtitle}>
                Tổng hợp các album tuyển tập chất lượng cao
              </p>
              <div className={styles.albumGridLarge}>
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
              <h3 className={styles.tabTitle}>
                Danh Sách Nghệ Sĩ
              </h3>
              <p className={styles.tabSubtitle}>
                Tất cả ca sĩ & ban nhạc trong hệ thống XtreMedia
              </p>
              <div className={styles.artistGridLarge}>
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
              <h3 className={styles.tabTitle}>
                Playlist Cá Nhân Của Bạn
              </h3>
              <p className={styles.tabSubtitle}>
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
            <div className={`glass-card ${styles.radioCard}`}>
              <Radio size={56} color="var(--accent-rose)" style={{ margin: '0 auto 20px' }} />
              <h3 className={styles.radioCardTitle}>
                XtreMedia 2000s Live Wave
              </h3>
              <p className={styles.radioCardText}>
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

      {/* Touch-Friendly Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenMenu={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
