export type Role = 'USER' | 'MODERATOR' | 'ADMIN';
export type Country = 'VIETNAM' | 'INTERNATIONAL';
export type SongStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash' | 'salt'>;

export interface AuthSession {
  user: SafeUser;
  token: string;
  expiresAt: number;
}

export interface Artist {
  id: string;
  name: string;
  nameAscii: string;
  slug: string;
  avatarUrl: string;
  bio?: string;
  country: Country;
  viewCount: number;
}

export interface Album {
  id: string;
  title: string;
  titleAscii: string;
  slug: string;
  coverUrl: string;
  description?: string;
  artistId: string;
  artistName: string;
  releaseDate?: string;
  viewCount: number;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
}

export interface Song {
  id: string;
  title: string;
  titleAscii: string;
  slug: string;
  artistId: string;
  artistName: string;
  albumId?: string | null;
  albumTitle?: string | null;
  genreId?: string | null;
  genreName?: string | null;
  audioUrl: string;
  coverUrl: string;
  durationSeconds: number;
  bitrateKbps: number;
  lyricsLrc?: string;
  playCount: number;
  playCountMonth: number;
  downloadCount: number;
  isBroken: boolean;
  status: SongStatus;
  createdAt: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: Song[];
  createdAt: string;
}

export interface MusicGift {
  id: string;
  giftCode: string;
  song: Song;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
  sentAt: string;
  viewedAt?: string | null;
}

export interface Comment {
  id: string;
  songId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}
