'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import SongList from '@/components/SongList';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { deriveCatalogFromSongs, derivePersonalPlaylist, deriveRadioMix } from '@/lib/catalog';
import type { Genre, Song } from '@/lib/types';
import { Play, Pause, Disc, Mic2, Sparkles, Heart, Radio, ListMusic, Volume2, AlertTriangle, RefreshCcw, Music } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [songsList, setSongsList] = useState<Song[]>([]);
  const [genresList, setGenresList] = useState<Genre[]>([]);
  const [featuredSong, setFeaturedSong] = useState<Song | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { playSong, currentSong, isPlaying, togglePlayPause } = useAudioPlayer();
  const catalog = useMemo(() => deriveCatalogFromSongs(songsList, genresList), [songsList, genresList]);
  const personalPlaylist = useMemo(() => derivePersonalPlaylist(songsList, 3), [songsList]);
  const radioMix = useMemo(() => deriveRadioMix(songsList, 4), [songsList]);
  const activeSongPool = songsList;
  const albums = catalog.albums;
  const artists = catalog.artists;
  const genres = catalog.genres;

  const fetchCatalog = React.useCallback(async () => {
    setIsCatalogLoading(true);
    setCatalogError(null);

    try {
      const [songsResponse, genresResponse, heroResponse] = await Promise.all([
        fetch('/api/songs', { cache: 'no-store' }),
        fetch('/api/genres', { cache: 'no-store' }),
        fetch('/api/hero', { cache: 'no-store' }),
      ]);

      const songsData = await songsResponse.json();
      const genresData = await genresResponse.json();
      const heroData = await heroResponse.json();

      const songs = Array.isArray(songsData?.songs) ? songsData.songs : [];
      const nextGenres = Array.isArray(genresData?.genres) ? genresData.genres : [];

      setSongsList(songs);
      setGenresList(nextGenres);

      if (songs.length > 0) {
        const heroSong = heroData?.config?.songId
          ? songs.find((song: Song) => song.id === heroData.config.songId)
          : null;
        setFeaturedSong(heroSong || songs[0]);
      } else {
        setFeaturedSong(null);
      }
    } catch (err) {
      console.warn('Could not fetch music catalog from API:', err);
      setCatalogError('Không thể tải danh sách nhạc. Vui lòng thử lại sau.');
      setSongsList([]);
      setGenresList([]);
      setFeaturedSong(null);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

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
          genres={genres}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Page Views */}
        <div className={`${styles.contentPadding} content-padding`}>
          {isCatalogLoading ? (
            <div className={styles.stateCard}>
              <div className={styles.loaderHeader}>
                <div className={styles.loaderDot} />
                <div className={styles.loaderDot} />
                <div className={styles.loaderDot} />
              </div>
              <h3 className={styles.stateTitle}>Đang tải catalog nhạc</h3>
              <p className={styles.stateText}>Chuẩn bị danh sách bài hát và các lựa chọn gợi ý cho bạn.</p>
            </div>
          ) : catalogError ? (
            <div className={styles.stateCard}>
              <AlertTriangle size={32} color="var(--accent-rose)" />
              <h3 className={styles.stateTitle}>Không thể tải dữ liệu</h3>
              <p className={styles.stateText}>{catalogError}</p>
              <button className="btn-secondary" onClick={() => void fetchCatalog()}>
                <RefreshCcw size={16} />
                <span>Thử lại</span>
              </button>
            </div>
          ) : songsList.length === 0 ? (
            <div className={styles.stateCard}>
              <Music size={32} color="var(--accent-indigo)" />
              <h3 className={styles.stateTitle}>Chưa có dữ liệu nhạc</h3>
              <p className={styles.stateText}>Bộ sưu tập đang trống. Hãy đồng bộ bài hát hoặc thêm dữ liệu mới từ Studio.</p>
            </div>
          ) : currentTab === 'discover' && (
            <>
              {/* Hero Banner for Featured Trending Track */}
              {!searchQuery && !selectedGenre && featuredSong && (
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
                    {albums.map((album) => {
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
                    ? `Thể loại: ${genres.find((g) => g.id === selectedGenre)?.name ?? 'Chọn thể loại'}`
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
                    {artists.map((artist) => (
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
                {albums.map((album) => (
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
                {artists.map((artist) => (
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
                Danh sách gợi ý được sắp xếp dựa trên lượt nghe gần đây và mức độ quan tâm thực tế.
              </p>
              {personalPlaylist.length > 0 ? (
                <SongList
                  songs={personalPlaylist}
                  title="Bài Hát Đã Lưu Gần Đây"
                  subtitle="Danh sách nghe yêu thích tự động gợi ý từ dữ liệu nhạc đang có trong hệ thống"
                />
              ) : (
                <div className={styles.stateCard}>
                  <Music size={32} color="var(--accent-indigo)" />
                  <h3 className={styles.stateTitle}>Playlist đang trống</h3>
                  <p className={styles.stateText}>Chưa có bài hát phù hợp để gợi ý cho tài khoản của bạn.</p>
                </div>
              )}
            </div>
          )}

          {currentTab === 'radio' && (
            <div className={`glass-card ${styles.radioCard}`}>
              <Radio size={56} color="var(--accent-rose)" style={{ margin: '0 auto 20px' }} />
              <h3 className={styles.radioCardTitle}>
                XtreMedia 2000s Live Wave
              </h3>
              <p className={styles.radioCardText}>
                {radioMix.length > 0
                  ? `Kênh phát thanh đang chạy theo chuỗi ${radioMix.length} bài được chọn từ catalog hiện có.`
                  : 'Kênh phát thanh đang chờ dữ liệu để tạo luồng nghe mượt và đa dạng.'}
              </p>

              {radioMix.length > 0 && (
                <div style={{ marginBottom: '20px', display: 'grid', gap: '10px', width: '100%' }}>
                  {radioMix.map((song) => (
                    <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <img src={song.coverUrl} alt={song.title} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: '#FFF', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artistName}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--accent-indigo)', fontWeight: 700 }}>{song.genreName || 'Khác'}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() => {
                  const radioSong = radioMix[0] ?? songsList[1] ?? songsList[0];
                  if (radioSong) {
                    const queue = radioMix.length > 0 ? radioMix : activeSongPool;
                    playSong(radioSong, queue);
                  }
                }}
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
