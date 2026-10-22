import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn() }));
vi.mock('../db/client.js', () => ({ prisma: { account: { findUnique: mocks.findUnique, findMany: mocks.findMany } } }));
vi.mock('../utils/cache.js', () => ({ cacheKey: () => '', cacheTtlSeconds: () => 0, clearCache: vi.fn(),
  withCache: (_key: string, loader: () => Promise<unknown>) => loader() }));
vi.mock('../utils/imagor.js', () => ({ buildImagorUrl: () => null }));
import { getAccount, listAccounts } from './accountsService.js';
beforeEach(() => vi.resetAllMocks());
describe('account post counts', () => {
  it('returns the selected count without requiring eager-loaded posts', async () => {
    const row = { id: 'account_a', latestProfilePicUrl: null, createdAt: new Date(), updatedAt: new Date(),
      lastIndexedAt: null, profilePics: [], _count: { posts: 7 } };
    mocks.findUnique.mockResolvedValue(row); mocks.findMany.mockResolvedValue([row]);
    expect((await getAccount('account_a'))?.postCount).toBe(7);
    expect((await listAccounts())[0].postCount).toBe(7);
    expect(mocks.findUnique.mock.lastCall![0].include._count).toEqual({ select: { posts: true } });
    expect(mocks.findMany.mock.lastCall![0].include._count).toEqual({ select: { posts: true } });
  });
});
