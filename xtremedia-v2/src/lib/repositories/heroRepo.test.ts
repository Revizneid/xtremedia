import assert from 'node:assert/strict';
import test from 'node:test';
import { heroRepo } from './heroRepo';
import { prisma } from '@/lib/prisma';

test('heroRepo lists active banners sorted by sortOrder', async () => {
  const original = prisma.heroBanner;

  try {
    (prisma as any).heroBanner = {
      findMany: async () => [
        { id: 'b1', title: 'A', subtitle: 'A1', imageUrl: 'https://a', linkUrl: '/', songId: null, sortOrder: 2, isActive: true, createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-02') },
        { id: 'b2', title: 'B', subtitle: 'B1', imageUrl: 'https://b', linkUrl: '/listen', songId: null, sortOrder: 1, isActive: true, createdAt: new Date('2024-01-03'), updatedAt: new Date('2024-01-04') },
      ],
      create: async (input: any) => ({ ...input.data, id: 'new' }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      delete: async ({ where }: any) => ({ id: where.id }),
      updateMany: async () => undefined,
    };

    const list = await heroRepo.list();
    assert.deepEqual(list.map((item) => item.id), ['b2', 'b1']);
    assert.equal(list[0]?.sortOrder, 1);
  } finally {
    (prisma as any).heroBanner = original;
  }
});

test('heroRepo create and update honor the expected payload shape', async () => {
  const original = prisma.heroBanner;

  try {
    let created: any = null;
    (prisma as any).heroBanner = {
      findMany: async () => [],
      findUnique: async () => ({ id: 'created-id', title: 'Created', subtitle: 'Sub', imageUrl: 'https://cdn.example.com/a.jpg', linkUrl: '/listen', songId: 'song-1', sortOrder: 3, isActive: true, createdAt: new Date(), updatedAt: new Date() }),
      create: async (input: any) => {
        created = input.data;
        return { id: 'created-id', ...input.data, createdAt: new Date(), updatedAt: new Date() };
      },
      update: async ({ data }: any) => ({ id: 'created-id', ...data, createdAt: new Date(), updatedAt: new Date() }),
      delete: async () => ({ id: 'created-id' }),
      updateMany: async () => undefined,
    };

    const createdBanner = await heroRepo.create({ title: 'Created', subtitle: 'Sub', imageUrl: 'https://cdn.example.com/a.jpg', linkUrl: '/listen', songId: 'song-1', sortOrder: 3, isActive: true });
    assert.equal(createdBanner.title, 'Created');
    assert.equal(createdBanner.imageUrl, 'https://cdn.example.com/a.jpg');
    assert.equal(created?.sortOrder, 3);

    const updated = await heroRepo.update('created-id', { title: 'Updated', isActive: false });
    assert.equal(updated?.title, 'Updated');
    assert.equal(updated?.isActive, false);
  } finally {
    (prisma as any).heroBanner = original;
  }
});
