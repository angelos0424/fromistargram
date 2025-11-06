import { prisma } from '../db/client.js';
import { cacheKey, cacheTtlSeconds, withCache } from '../utils/cache.js';

export type AccountSummary = {
  id: string;
  latestProfilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string | null;
  postCount: number;
};

type AccountRow = {
  id: string;
  latestProfilePicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastIndexedAt: Date | null;
  _count: { posts: number };
};

export async function listAccounts(): Promise<AccountSummary[]> {
  const key = cacheKey(['accounts', 'list']);
  return withCache(
    key,
    async () => {
      const accounts = await prisma.account.findMany({
        orderBy: { id: 'asc' },
        include: { _count: { select: { posts: true } } }
      }) as AccountRow[];

      return accounts.map((account: AccountRow) => ({
        id: account.id,
        latestProfilePicUrl: account.latestProfilePicUrl,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        lastIndexedAt: account.lastIndexedAt ? account.lastIndexedAt.toISOString() : null,
        postCount: account._count.posts
      }));
    },
    cacheTtlSeconds()
  );
}
