import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), cacheKey: vi.fn() }));
vi.mock('../db/client.js', () => ({ prisma: { post: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique } } }));
vi.mock('../utils/cache.js', () => ({
  cacheKey: mocks.cacheKey, cacheTtlSeconds: () => 0, clearCache: vi.fn(),
  withCache: (_key: string, loader: () => Promise<unknown>) => loader()
}));
vi.mock('../utils/imagor.js', () => ({ buildImagorUrl: () => null }));
import { getPostById, listPosts } from './postsService.js';

function post(id: string, caption = 'ordinary', accountId = 'account_a') {
  return { id, accountId, caption, postedAt: new Date('2026-10-23T03:00:00Z'), hasText: true, type: 'Post',
    postText: { content: caption }, media: [], tags: [] };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.cacheKey.mockImplementation((parts) => JSON.stringify(parts));
  mocks.findMany.mockResolvedValue([]); mocks.count.mockResolvedValue(0); mocks.findUnique.mockResolvedValue(null);
});
describe('post list filters', () => {
  it('uses the same deterministic tie-breaker for oldest-first cursor pagination', async () => {
    await listPosts({ sort: 'oldest', cursor: 'last-seen', limit: 12 });
    expect(mocks.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      orderBy: [{ postedAt: 'asc' }, { id: 'asc' }],
      cursor: { id: 'last-seen' }, skip: 1, take: 13
    }));
  });

  it('finds a match outside the original first page and uses the same search/date predicates for total', async () => {
    const rows = Array.from({ length: 13 }, (_, i) => post(`post_${i + 1}`, i === 12 ? 'rare needle' : 'ordinary'));
    mocks.findMany.mockImplementation(async ({ where, take, skip = 0 }) => {
      const matching = where.OR ? rows.filter((row) => row.caption.includes(where.OR[0].caption.contains)) : rows;
      return matching.slice(skip, skip + take);
    });
    mocks.count.mockImplementation(async ({ where }) => where.OR ? 1 : rows.length);
    const first = await listPosts({ limit: 12, page: 1 });
    expect(first.data.some((row) => row.id === 'post_13')).toBe(false);
    const found = await listPosts({ limit: 12, page: 1, search: ' needle ', postedAtFrom: '2026-10-23', postedAtTo: '2026-10-23' });
    expect(found.data.map((row) => row.id)).toEqual(['post_13']);
    expect(found.total).toBe(1);
    expect(found.pageInfo.hasNextPage).toBe(false);
    const where = mocks.findMany.mock.lastCall![0].where;
    expect(mocks.count.mock.lastCall![0].where).toEqual(where);
    expect(mocks.findMany.mock.lastCall![0].orderBy).toEqual([{ postedAt: 'desc' }, { id: 'desc' }]);
    expect(where.postedAt).toEqual({ gte: new Date('2026-10-22T15:00:00Z'), lt: new Date('2026-10-23T15:00:00Z') });
    expect(where.OR).toEqual([
      { caption: { contains: 'needle', mode: 'insensitive' } },
      { accountId: { contains: 'needle', mode: 'insensitive' } },
      { postText: { is: { content: { contains: 'needle', mode: 'insensitive' } } } },
      { tags: { some: { tag: { name: { contains: 'needle', mode: 'insensitive' } } } } }
    ]);
    expect(mocks.cacheKey.mock.calls[0][0]).not.toEqual(mocks.cacheKey.mock.calls[1][0]);
  });
});
describe('post URL compatibility', () => {
  const legacyId = '2026-10-23_03-00-00_UTC';
  it('continues to resolve a legacy URL directly', async () => {
    mocks.findUnique.mockResolvedValue(post(legacyId));
    expect((await getPostById(legacyId))?.id).toBe(legacyId);
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });
  it('resolves a canonical upload URL to the same account legacy record', async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(post(legacyId));
    expect((await getPostById(`${legacyId}_post_account_a`))?.accountId).toBe('account_a');
    expect(mocks.findUnique.mock.lastCall![0].where.id).toBe(legacyId);
  });
  it('does not resolve another account canonical URL to the legacy owner', async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(post(legacyId));
    expect(await getPostById(`${legacyId}_post_account_b`)).toBeNull();
  });
});
