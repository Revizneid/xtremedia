import { prisma } from '@/lib/prisma';
import type { Comment } from '@/lib/types';

function toLegacyComment(record: {
  id: string;
  songId: string;
  userId: string;
  content: string;
  createdAt: Date;
  user?: { displayName: string | null; username: string | null; avatarUrl: string | null };
}): Comment {
  return {
    id: record.id,
    songId: record.songId,
    userId: record.userId,
    userName: record.user?.displayName || record.user?.username || 'XtreMedia User',
    userAvatar: record.user?.avatarUrl || undefined,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
  };
}

export const commentRepo = {
  async getComments(songId?: string): Promise<Comment[]> {
    const records = await prisma.comment.findMany({
      where: songId ? { songId } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toLegacyComment);
  },

  async addComment(params: {
    songId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
  }): Promise<Comment> {
    const record = await prisma.comment.create({
      data: {
        songId: params.songId,
        userId: params.userId,
        content: params.content.trim(),
      },
      include: { user: true },
    });

    return toLegacyComment(record);
  },

  async deleteComment(id: string): Promise<boolean> {
    try {
      await prisma.comment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
