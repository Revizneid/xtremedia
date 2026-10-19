import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const nodeEnv = String(process.env.NODE_ENV ?? 'development');

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
