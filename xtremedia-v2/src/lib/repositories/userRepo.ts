import { prisma } from '@/lib/prisma';
import { hashPassword, sanitizeUser } from '@/lib/auth';
import type { Role, SafeUser, User } from '@/lib/types';

function toLegacyUser(record: {
  id: string;
  email: string;
  username: string | null;
  passwordHash: string;
  displayName: string | null;
  avatarUrl: string | null;
  salt: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: record.id,
    username: record.username || record.email.split('@')[0],
    email: record.email,
    passwordHash: record.passwordHash,
    salt: record.salt || '',
    displayName: record.displayName || record.username || record.email.split('@')[0],
    role: (record.role as Role) || 'USER',
    avatarUrl: record.avatarUrl || undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const userRepo = {
  async getUsers(): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((user) => sanitizeUser(toLegacyUser(user)));
  },

  async findUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toLegacyUser(user) : null;
  },

  async findUserByUsername(username: string): Promise<User | null> {
    const value = username.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { username: { equals: value, mode: 'insensitive' } },
    });
    return user ? toLegacyUser(user) : null;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const value = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: value } });
    return user ? toLegacyUser(user) : null;
  },

  async findUserByIdentifier(identifier: string): Promise<User | null> {
    const value = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: value, mode: 'insensitive' } },
          { username: { equals: value, mode: 'insensitive' } },
        ],
      },
    });
    return user ? toLegacyUser(user) : null;
  },

  async createUser(params: {
    username: string;
    email: string;
    password: string;
    displayName: string;
    role?: Role;
    avatarUrl?: string;
  }): Promise<SafeUser> {
    const email = params.email.trim().toLowerCase();
    const username = params.username.trim();
    const { hash, salt } = hashPassword(params.password);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hash,
        salt,
        displayName: params.displayName.trim() || username,
        avatarUrl: params.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`,
        role: (params.role || 'USER') as Role,
      },
    });

    return sanitizeUser(toLegacyUser(user));
  },

  async updateUser(id: string, updates: Partial<User>): Promise<SafeUser | null> {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) return null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
        ...(updates.username ? { username: updates.username.trim() } : {}),
        ...(updates.passwordHash ? { passwordHash: updates.passwordHash } : {}),
        ...(updates.displayName !== undefined ? { displayName: updates.displayName || null } : {}),
        ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl || null } : {}),
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.salt !== undefined ? { salt: updates.salt || null } : {}),
      },
    });

    return sanitizeUser(toLegacyUser(updated));
  },
};
