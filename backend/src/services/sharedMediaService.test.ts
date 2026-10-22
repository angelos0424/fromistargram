import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock('../db/client.js', () => ({ prisma: { sharedMedia: { findMany: mocks.findMany, count: mocks.count } } }));
import { listSharedMedia } from './sharedMediaService.js';
beforeEach(() => { vi.resetAllMocks(); mocks.findMany.mockResolvedValue([]); mocks.count.mockResolvedValue(0); });
describe('shared media filtering', () => {
  it('uses KST date bounds and one search predicate for cursor results and total', async () => {
    await listSharedMedia({ from: '2026-10-23', to: '2026-10-23', search: ' Needle ' });
    const where = mocks.findMany.mock.lastCall![0].where;
    expect(mocks.count).toHaveBeenCalledWith({ where });
    expect(where).toMatchObject({ isDeleted: false, uploadedAt: {
      gte: new Date('2026-10-22T15:00:00Z'), lt: new Date('2026-10-23T15:00:00Z')
    } });
    expect(where.OR).toEqual(['caption', 'accountName', 'originalName', 'filename'].map((name) => ({
      [name]: { contains: 'Needle', mode: 'insensitive' }
    })));
  });
  it('paginates matching groups and returns all files from a group that matched one filename', async () => {
    const date = new Date('2026-10-23T03:00:00Z');
    const first = { id: 'file_13', uploadBatchId: 'batch_13', uploadedAt: date, originalName: 'needle.jpg' };
    const sibling = { id: 'file_14', uploadBatchId: 'batch_13', uploadedAt: date, originalName: 'other.jpg' };
    mocks.findMany.mockResolvedValueOnce([first]).mockResolvedValueOnce([first, sibling]);
    const response = await listSharedMedia({ page: 1, limit: 12, search: 'needle', from: '2026-10-23' });
    expect(response).toMatchObject({ data: [first, sibling], total: 1, hasMore: false });
    const selection = mocks.findMany.mock.calls[0][0].where;
    expect(selection.OR).toBeDefined();
    const page = mocks.findMany.mock.calls[1][0].where;
    expect(page).toEqual({ AND: [
      { isDeleted: false, uploadedAt: { gte: new Date('2026-10-22T15:00:00Z') } },
      { OR: [{ uploadBatchId: { in: ['batch_13'] } }] }
    ] });
  });
  it('returns zero total without a second page query when search matches nothing', async () => {
    const response = await listSharedMedia({ page: 1, search: 'missing' });
    expect(response).toMatchObject({ data: [], total: 0, hasMore: false });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('shared media cursor pagination', () => {
  // Later-created IDs can have older capture dates through mobile ingest.
  const rows = [
    { id: 'cm001', uploadedAt: new Date('2026-10-23T00:00:00Z'), isDeleted: false },
    { id: 'cm002', uploadedAt: new Date('2026-10-22T00:00:00Z'), isDeleted: false },
    { id: 'cm003', uploadedAt: new Date('2026-10-21T00:00:00Z'), isDeleted: false }
  ];
  function useRows() {
    mocks.count.mockImplementation(async ({ where }) => rows.filter((row) =>
      !where.id?.lt || row.id < where.id.lt).length);
    mocks.findMany.mockImplementation(async ({ where, orderBy, cursor, skip = 0, take }) => {
      const ordering = Array.isArray(orderBy) ? orderBy : [orderBy];
      const direction = ordering[0].uploadedAt === 'asc' ? 1 : -1;
      const filtered = rows.filter((row) => !where.id?.lt || row.id < where.id.lt);
      const sorted = [...filtered].sort((a, b) => direction * (
        a.uploadedAt.getTime() - b.uploadedAt.getTime() || a.id.localeCompare(b.id)
      ));
      const offset = cursor ? sorted.findIndex((row) => row.id === cursor.id) + skip : skip;
      return sorted.slice(offset, offset + take);
    });
  }

  it.each([
    ['newest', ['cm001', 'cm002', 'cm003']],
    ['oldest', ['cm003', 'cm002', 'cm001']]
  ] as const)('does not skip backdated media in %s order and keeps total constant', async (sort, expectedIds) => {
    useRows();
    let cursor: string | undefined;
    const ids: string[] = [];
    for (let page = 0; page < 3; page += 1) {
      const result = await listSharedMedia({ sort, limit: 1, cursor });
      ids.push(result.data[0].id);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(page < 2);
      cursor = result.nextCursor ?? undefined;
    }
    expect(ids).toEqual(expectedIds);
    const direction = sort === 'oldest' ? 'asc' : 'desc';
    expect(mocks.findMany.mock.lastCall![0]).toMatchObject({
      orderBy: [{ uploadedAt: direction }, { id: direction }], cursor: { id: expectedIds[1] }, skip: 1
    });
    expect(mocks.count.mock.calls.every(([args]) => args.where.id === undefined)).toBe(true);
  });

  it('gives group-page mode precedence over an accompanying cursor and uses stable group order', async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await listSharedMedia({ page: 1, cursor: 'ignored-cursor', sort: 'oldest' });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.lastCall![0]).toMatchObject({
      where: { isDeleted: false }, orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }]
    });
    expect(mocks.findMany.mock.lastCall![0]).not.toHaveProperty('cursor');
    expect(mocks.findMany.mock.lastCall![0].where).not.toHaveProperty('id');
  });
});
