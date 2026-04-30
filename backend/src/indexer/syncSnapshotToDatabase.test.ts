import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  account: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  post: {
    findMany: vi.fn(),
    deleteMany: vi.fn()
  },
  profilePic: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  highlight: {
    findMany: vi.fn(),
    deleteMany: vi.fn()
  }
};

const clearCacheMock = vi.fn();

vi.mock('../db/client.js', () => ({
  prisma: prismaMock
}));

vi.mock('../utils/cache.js', () => ({
  clearCache: clearCacheMock
}));

describe('syncSnapshotToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.account.findUnique.mockResolvedValue({ id: 'account_1' });
    prismaMock.account.upsert.mockResolvedValue({});
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.profilePic.findMany.mockResolvedValue([]);
    prismaMock.profilePic.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.profilePic.create.mockResolvedValue({});
    prismaMock.profilePic.update.mockResolvedValue({});
    prismaMock.highlight.findMany.mockResolvedValue([]);
    prismaMock.highlight.deleteMany.mockResolvedValue({ count: 0 });
    clearCacheMock.mockResolvedValue(undefined);
  });

  it('deduplicates profile picture ids before creating rows', async () => {
    const { syncSnapshotToDatabase } = await import('./indexer.js');
    const takenAt = new Date('2026-04-29T00:00:00.000Z');

    const result = await syncSnapshotToDatabase({
      accounts: [
        {
          id: 'account_1',
          profilePictures: [
            {
              id: 'profile_1',
              accountId: 'account_1',
              takenAt,
              filename: 'old.jpg'
            },
            {
              id: 'profile_1',
              accountId: 'account_1',
              takenAt,
              filename: 'new.jpg'
            }
          ],
          posts: [],
          highlights: []
        }
      ]
    });

    expect(prismaMock.profilePic.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.profilePic.create).toHaveBeenCalledWith({
      data: {
        id: 'profile_1',
        accountId: 'account_1',
        takenAt,
        filename: 'new.jpg'
      }
    });
    expect(result.profilePicsSynced).toBe(1);
  });
});
