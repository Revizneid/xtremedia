import { albumRepo } from './repositories/albumRepo';
import { artistRepo } from './repositories/artistRepo';
import { commentRepo } from './repositories/commentRepo';
import { genreRepo } from './repositories/genreRepo';
import { heroRepo } from './repositories/heroRepo';
import { playlistRepo } from './repositories/playlistRepo';
import { songRepo } from './repositories/songRepo';
import { syncLogRepo } from './repositories/syncLogRepo';
import { userRepo } from './repositories/userRepo';
import type { Artist, Album, Genre, Song, Comment, User, SafeUser, Role } from './types';

export const db = {
  async getSongs(options?: { genreId?: string; artistId?: string; search?: string; sortBy?: 'newest' | 'top_plays' | 'top_downloads'; }): Promise<Song[]> {
    return songRepo.getSongs(options);
  },
  async getSongById(id: string): Promise<Song | null> {
    return songRepo.getSongById(id);
  },
  async addSong(song: Song): Promise<Song> {
    return songRepo.addSong(song);
  },
  async updateSong(id: string, updates: Partial<Song>): Promise<Song | null> {
    return songRepo.updateSong(id, updates);
  },
  async deleteSong(id: string): Promise<boolean> {
    return songRepo.deleteSong(id);
  },
  async incrementPlay(id: string): Promise<Song | null> {
    return songRepo.incrementPlay(id);
  },
  async incrementDownload(id: string): Promise<Song | null> {
    return songRepo.incrementDownload(id);
  },
  async reportBroken(id: string): Promise<boolean> {
    return songRepo.reportBroken(id);
  },
  async fixBroken(id: string, newAudioUrl?: string): Promise<boolean> {
    return songRepo.fixBroken(id, newAudioUrl);
  },
  async getBrokenSongs(): Promise<Song[]> {
    return songRepo.getBrokenSongs();
  },
  async getAdminStats() {
    return songRepo.getAdminStats();
  },

  async getArtists(): Promise<Artist[]> {
    return artistRepo.getArtists();
  },
  async getArtistById(id: string): Promise<Artist | null> {
    return artistRepo.getArtistById(id);
  },
  async addArtist(artist: Artist): Promise<Artist> {
    return artistRepo.addArtist(artist);
  },
  async updateArtist(id: string, updates: Partial<Artist>): Promise<Artist | null> {
    return artistRepo.updateArtist(id, updates);
  },
  async deleteArtist(id: string): Promise<boolean> {
    return artistRepo.deleteArtist(id);
  },

  async getAlbums(): Promise<Album[]> {
    return albumRepo.getAlbums();
  },
  async getAlbumById(id: string): Promise<Album | null> {
    return albumRepo.getAlbumById(id);
  },
  async addAlbum(album: Album): Promise<Album> {
    return albumRepo.addAlbum(album);
  },
  async updateAlbum(id: string, updates: Partial<Album>): Promise<Album | null> {
    return albumRepo.updateAlbum(id, updates);
  },
  async deleteAlbum(id: string): Promise<boolean> {
    return albumRepo.deleteAlbum(id);
  },

  async getGenres(): Promise<Genre[]> {
    return genreRepo.getGenres();
  },
  async addGenre(genre: Genre): Promise<Genre> {
    return genreRepo.addGenre(genre);
  },
  async deleteGenre(id: string): Promise<boolean> {
    return genreRepo.deleteGenre(id);
  },

  async listHeroBanners() {
    return heroRepo.list();
  },
  async getActiveHeroBanners() {
    return heroRepo.getActive();
  },
  async getHeroBannerById(id: string) {
    return heroRepo.getById(id);
  },
  async createHeroBanner(input: Parameters<typeof heroRepo.create>[0]) {
    return heroRepo.create(input);
  },
  async updateHeroBanner(id: string, updates: Parameters<typeof heroRepo.update>[1]) {
    return heroRepo.update(id, updates);
  },
  async deleteHeroBanner(id: string): Promise<boolean> {
    return heroRepo.remove(id);
  },
  async reorderHeroBanners(ids: string[]) {
    return heroRepo.reorder(ids);
  },

  async getPlaylist(): Promise<Song[]> {
    return playlistRepo.getPlaylist();
  },
  async addToPlaylist(songId: string): Promise<boolean> {
    return playlistRepo.addToPlaylist(songId);
  },
  async removeFromPlaylist(songId: string): Promise<boolean> {
    return playlistRepo.removeFromPlaylist(songId);
  },

  async getComments(songId?: string): Promise<Comment[]> {
    return commentRepo.getComments(songId);
  },
  async addComment(params: {
    songId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
  }): Promise<Comment> {
    return commentRepo.addComment(params);
  },
  async deleteComment(id: string): Promise<boolean> {
    return commentRepo.deleteComment(id);
  },

  async syncSongFromStudio(input: {
    idempotencyKey: string;
    payloadHash: string;
    payload: {
      title: string;
      artistName?: string;
      genreName?: string;
      albumTitle?: string;
      audioUrl: string;
      coverUrl?: string;
      durationSeconds?: number;
      bitrateKbps?: number;
      lyricsLrc?: string;
      id?: string;
      videoId?: string;
      trimStart?: number;
      trimEnd?: number;
    };
  }): Promise<{ duplicate: boolean; song: Song | null; status: 'SUCCESS' | 'REUSED' }> {
    return syncLogRepo.syncSongFromStudio(input);
  },

  async getUsers(): Promise<SafeUser[]> {
    return userRepo.getUsers();
  },
  async findUserById(id: string): Promise<User | null> {
    return userRepo.findUserById(id);
  },
  async findUserByUsername(username: string): Promise<User | null> {
    return userRepo.findUserByUsername(username);
  },
  async findUserByEmail(email: string): Promise<User | null> {
    return userRepo.findUserByEmail(email);
  },
  async findUserByIdentifier(identifier: string): Promise<User | null> {
    return userRepo.findUserByIdentifier(identifier);
  },
  async createUser(params: { username: string; email: string; password: string; displayName: string; role?: Role; avatarUrl?: string }): Promise<SafeUser> {
    return userRepo.createUser(params);
  },
  async updateUser(id: string, updates: Partial<User>): Promise<SafeUser | null> {
    return userRepo.updateUser(id, updates);
  },
};
