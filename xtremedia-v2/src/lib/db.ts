import fs from 'fs';
import path from 'path';
import { INITIAL_SONGS, INITIAL_ARTISTS, INITIAL_ALBUMS, INITIAL_GENRES } from './mockData';
import { Song, Artist, Album, Genre, MusicGift, Comment, User, SafeUser, Role } from './types';
import { hashPassword, sanitizeUser } from './auth';

interface StoreData {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  genres: Genre[];
  gifts: MusicGift[];
  playlist: Song[];
  comments: Comment[];
  users: User[];
  config: Record<string, string>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function getInitialSeedUsers(): User[] {
  const adminAuth = hashPassword('admin123', 'seedadminsalt1234');
  const memberAuth = hashPassword('member123', 'seedmembersalt123');
  return [
    {
      id: 'user-admin',
      username: 'admin',
      email: 'admin@xtremedia.vn',
      passwordHash: adminAuth.hash,
      salt: adminAuth.salt,
      displayName: 'XtreMedia Administrator',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'user-member',
      username: 'member',
      email: 'member@xtremedia.vn',
      passwordHash: memberAuth.hash,
      salt: memberAuth.salt,
      displayName: 'Thành Viên Âm Nhạc',
      role: 'USER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];
}

class DatabaseStore {
  private data: StoreData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const fileContent = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        const users = parsed.users && parsed.users.length > 0 ? parsed.users : getInitialSeedUsers();
        return {
          songs: parsed.songs || [...INITIAL_SONGS],
          artists: parsed.artists || [...INITIAL_ARTISTS],
          albums: parsed.albums || [...INITIAL_ALBUMS],
          genres: parsed.genres || [...INITIAL_GENRES],
          gifts: parsed.gifts || [],
          playlist: parsed.playlist || [],
          comments: parsed.comments || [],
          users: users,
          config: parsed.config || { webTitle: 'XtreMedia V2' },
        };
      }
    } catch (err) {
      console.warn('Could not read existing store.json, initializing fresh store:', err);
    }

    const defaultData: StoreData = {
      songs: [...INITIAL_SONGS],
      artists: [...INITIAL_ARTISTS],
      albums: [...INITIAL_ALBUMS],
      genres: [...INITIAL_GENRES],
      gifts: [],
      playlist: [],
      comments: [],
      users: getInitialSeedUsers(),
      config: { webTitle: 'XtreMedia V2' },
    };

    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(dataToSave?: StoreData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist store.json to disk:', err);
    }
  }

  // --- Songs ---
  getSongs(options?: {
    genreId?: string;
    artistId?: string;
    search?: string;
    sortBy?: 'newest' | 'top_plays' | 'top_downloads';
  }): Song[] {
    let result = [...this.data.songs];

    if (options?.genreId) {
      result = result.filter((s) => s.genreId === options.genreId);
    }

    if (options?.artistId) {
      result = result.filter((s) => s.artistId === options.artistId);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.titleAscii.toLowerCase().includes(q) ||
          s.artistName.toLowerCase().includes(q)
      );
    }

    if (options?.sortBy === 'top_plays') {
      result.sort((a, b) => b.playCount - a.playCount);
    } else if (options?.sortBy === 'top_downloads') {
      result.sort((a, b) => b.downloadCount - a.downloadCount);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  getSongById(id: string): Song | undefined {
    return this.data.songs.find((s) => s.id === id);
  }

  addSong(song: Song): Song {
    this.data.songs.unshift(song);
    this.saveData();
    return song;
  }

  updateSong(id: string, updates: Partial<Song>): Song | null {
    const idx = this.data.songs.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.songs[idx] = { ...this.data.songs[idx], ...updates };
    this.saveData();
    return this.data.songs[idx];
  }

  deleteSong(id: string): boolean {
    const initial = this.data.songs.length;
    this.data.songs = this.data.songs.filter((s) => s.id !== id);
    if (this.data.songs.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  incrementPlay(id: string): Song | undefined {
    const song = this.data.songs.find((s) => s.id === id);
    if (song) {
      song.playCount += 1;
      song.playCountMonth += 1;
      this.saveData();
    }
    return song;
  }

  incrementDownload(id: string): Song | undefined {
    const song = this.data.songs.find((s) => s.id === id);
    if (song) {
      song.downloadCount += 1;
      this.saveData();
    }
    return song;
  }

  reportBroken(id: string): boolean {
    const song = this.data.songs.find((s) => s.id === id);
    if (song) {
      song.isBroken = true;
      this.saveData();
      return true;
    }
    return false;
  }

  fixBroken(id: string, newAudioUrl?: string): boolean {
    const song = this.data.songs.find((s) => s.id === id);
    if (song) {
      song.isBroken = false;
      if (newAudioUrl && newAudioUrl.trim()) {
        song.audioUrl = newAudioUrl.trim();
      }
      this.saveData();
      return true;
    }
    return false;
  }

  getBrokenSongs(): Song[] {
    return this.data.songs.filter((s) => s.isBroken);
  }

  getAdminStats() {
    const totalSongs = this.data.songs.length;
    const totalArtists = this.data.artists.length;
    const totalAlbums = this.data.albums.length;
    const totalGenres = this.data.genres.length;
    const totalUsers = this.data.users.length;
    const brokenSongsCount = this.data.songs.filter((s) => s.isBroken).length;
    const totalPlays = this.data.songs.reduce((sum, s) => sum + s.playCount, 0);
    const totalDownloads = this.data.songs.reduce((sum, s) => sum + s.downloadCount, 0);

    const topSongs = [...this.data.songs]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);

    const recentBrokenSongs = this.data.songs.filter((s) => s.isBroken).slice(0, 5);

    return {
      totalSongs,
      totalArtists,
      totalAlbums,
      totalGenres,
      totalUsers,
      brokenSongsCount,
      totalPlays,
      totalDownloads,
      topSongs,
      recentBrokenSongs,
    };
  }

  // --- Artists ---
  getArtists(): Artist[] {
    return this.data.artists;
  }

  getArtistById(id: string): Artist | undefined {
    return this.data.artists.find((a) => a.id === id);
  }

  addArtist(artist: Artist): Artist {
    if (!this.data.artists.some((a) => a.id === artist.id || a.slug === artist.slug)) {
      this.data.artists.push(artist);
      this.saveData();
    }
    return artist;
  }

  deleteArtist(id: string): boolean {
    const initial = this.data.artists.length;
    this.data.artists = this.data.artists.filter((a) => a.id !== id);
    if (this.data.artists.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Albums ---
  getAlbums(): Album[] {
    return this.data.albums;
  }

  getAlbumById(id: string): Album | undefined {
    return this.data.albums.find((a) => a.id === id);
  }

  addAlbum(album: Album): Album {
    if (!this.data.albums.some((a) => a.id === album.id || a.slug === album.slug)) {
      this.data.albums.push(album);
      this.saveData();
    }
    return album;
  }

  deleteAlbum(id: string): boolean {
    const initial = this.data.albums.length;
    this.data.albums = this.data.albums.filter((a) => a.id !== id);
    if (this.data.albums.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Genres ---
  getGenres(): Genre[] {
    return this.data.genres;
  }

  addGenre(genre: Genre): Genre {
    if (!this.data.genres.some((g) => g.id === genre.id || g.slug === genre.slug)) {
      this.data.genres.push(genre);
      this.saveData();
    }
    return genre;
  }

  deleteGenre(id: string): boolean {
    const initial = this.data.genres.length;
    this.data.genres = this.data.genres.filter((g) => g.id !== id);
    if (this.data.genres.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Playlist ---
  getPlaylist(): Song[] {
    return this.data.playlist;
  }

  addToPlaylist(songId: string): boolean {
    const song = this.getSongById(songId);
    if (song && !this.data.playlist.some((item) => item.id === songId)) {
      this.data.playlist.push(song);
      this.saveData();
      return true;
    }
    return false;
  }

  removeFromPlaylist(songId: string): boolean {
    const initial = this.data.playlist.length;
    this.data.playlist = this.data.playlist.filter((s) => s.id !== songId);
    if (this.data.playlist.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- Gifts ---
  createGift(data: {
    songId: string;
    senderName: string;
    senderEmail: string;
    recipientName: string;
    recipientEmail: string;
    message: string;
  }): MusicGift | null {
    const song = this.getSongById(data.songId);
    if (!song) return null;

    const gift: MusicGift = {
      id: 'gift-' + Date.now(),
      giftCode: 'XM-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      song,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      message: data.message,
      sentAt: new Date().toISOString(),
    };

    this.data.gifts.push(gift);
    this.saveData();
    return gift;
  }

  getGiftByCode(code: string): MusicGift | undefined {
    const gift = this.data.gifts.find((g) => g.giftCode.toLowerCase() === code.toLowerCase());
    if (gift && !gift.viewedAt) {
      gift.viewedAt = new Date().toISOString();
      this.saveData();
    }
    return gift;
  }

  // --- Comments ---
  getComments(songId?: string): Comment[] {
    if (songId) {
      return this.data.comments
        .filter((c) => c.songId === songId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.comments;
  }

  addComment(params: {
    songId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
  }): Comment {
    const comment: Comment = {
      id: 'cmt-' + Date.now(),
      songId: params.songId,
      userId: params.userId,
      userName: params.userName,
      userAvatar: params.userAvatar,
      content: params.content.trim(),
      createdAt: new Date().toISOString(),
    };
    this.data.comments.unshift(comment);
    this.saveData();
    return comment;
  }

  deleteComment(id: string): boolean {
    const initial = this.data.comments.length;
    this.data.comments = this.data.comments.filter((c) => c.id !== id);
    if (this.data.comments.length !== initial) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Bulk import (used by migration scripts)
  bulkImport(imported: {
    songs?: Song[];
    artists?: Artist[];
    albums?: Album[];
    genres?: Genre[];
  }): { songsCount: number; artistsCount: number; albumsCount: number; genresCount: number } {
    let sCount = 0;
    let arCount = 0;
    let alCount = 0;
    let gCount = 0;

    if (imported.genres) {
      for (const g of imported.genres) {
        if (!this.data.genres.some((item) => item.name.toLowerCase() === g.name.toLowerCase())) {
          this.data.genres.push(g);
          gCount++;
        }
      }
    }

    if (imported.artists) {
      for (const a of imported.artists) {
        if (!this.data.artists.some((item) => item.name.toLowerCase() === a.name.toLowerCase())) {
          this.data.artists.push(a);
          arCount++;
        }
      }
    }

    if (imported.albums) {
      for (const al of imported.albums) {
        if (!this.data.albums.some((item) => item.title.toLowerCase() === al.title.toLowerCase())) {
          this.data.albums.push(al);
          alCount++;
        }
      }
    }

    if (imported.songs) {
      for (const s of imported.songs) {
        if (!this.data.songs.some((item) => item.title.toLowerCase() === s.title.toLowerCase())) {
          this.data.songs.push(s);
          sCount++;
        }
      }
    }

    this.saveData();
    return {
      songsCount: sCount,
      artistsCount: arCount,
      albumsCount: alCount,
      genresCount: gCount,
    };
  }

  // --- Users ---
  getUsers(): SafeUser[] {
    return this.data.users.map(sanitizeUser);
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  findUserByUsername(username: string): User | undefined {
    return this.data.users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  findUserByIdentifier(identifier: string): User | undefined {
    const clean = identifier.toLowerCase().trim();
    return this.data.users.find((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean);
  }

  createUser(params: {
    username: string;
    email: string;
    password: string;
    displayName: string;
    role?: Role;
    avatarUrl?: string;
  }): SafeUser {
    const { hash, salt } = hashPassword(params.password);
    const now = new Date().toISOString();
    const newUser: User = {
      id: 'user-' + Date.now(),
      username: params.username.trim(),
      email: params.email.trim(),
      passwordHash: hash,
      salt: salt,
      displayName: params.displayName.trim() || params.username.trim(),
      role: params.role || 'USER',
      avatarUrl: params.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(params.username)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(newUser);
    this.saveData();
    return sanitizeUser(newUser);
  }

  updateUser(id: string, updates: Partial<User>): SafeUser | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return sanitizeUser(this.data.users[idx]);
  }
}

export const db = new DatabaseStore();
