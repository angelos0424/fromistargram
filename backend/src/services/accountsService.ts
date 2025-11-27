import type { CrawlAccountStatus } from '@prisma/client';
import { prisma } from '../db/client.js';
import { cacheKey, cacheTtlSeconds, withCache } from '../utils/cache.js';
import { buildImagorUrl } from '../utils/imagor.js';

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

export type AdminAccount = {
  id: string;
  username: string;
  status: CrawlAccountStatus;
  note: string | null;
  lastSessionAt: string | null;
  createdAt: string;
  updatedAt: string;
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

      return accounts.map((account: AccountRow) => {
        let profileUrl = account.latestProfilePicUrl;
        if (profileUrl) {
          const source = `local:///${account.id}/${profileUrl}`;
          const signed = buildImagorUrl(source, {
            resize: { width: 300, height: 300, type: 'fill' } // Reasonable default for profile pics
          });
          if (signed) {
            profileUrl = signed;
          }
        }

        return {
          id: account.id,
          latestProfilePicUrl: profileUrl,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          lastIndexedAt: account.lastIndexedAt ? account.lastIndexedAt.toISOString() : null,
          postCount: account._count.posts
        };
      });
    },
    cacheTtlSeconds()
  );
}

const mapCrawlAccount = (account: {
  id: string;
  username: string;
  status: CrawlAccountStatus;
  note: string | null;
  lastSessionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminAccount => ({
  id: account.id,
  username: account.username,
  status: account.status,
  note: account.note,
  lastSessionAt: account.lastSessionAt ? account.lastSessionAt.toISOString() : null,
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt.toISOString()
});

export type CreateCrawlerAccountInput = {
  username: string;
  password: string;
  note?: string | null;
};

export type UpdateCrawlerAccountInput = {
  username?: string;
  password?: string | null;
  note?: string | null;
  status?: CrawlAccountStatus;
};

export async function listCrawlerAccounts(): Promise<AdminAccount[]> {
  const accounts = await prisma.crawlAccount.findMany({
    orderBy: { username: 'asc' }
  });
  return accounts.map(mapCrawlAccount);
}

export async function createCrawlerAccount(
  payload: CreateCrawlerAccountInput
): Promise<AdminAccount> {
  const account = await prisma.crawlAccount.create({
    data: {
      username: payload.username,
      password: payload.password,
      note: payload.note ?? null
    }
  });
  return mapCrawlAccount(account);
}

export async function updateCrawlerAccount(
  id: string,
  patch: UpdateCrawlerAccountInput
): Promise<AdminAccount | null> {
  const existing = await prisma.crawlAccount.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const data: {
    username?: string;
    password?: string | null;
    note?: string | null;
    status?: CrawlAccountStatus;
  } = {};

  if (typeof patch.username === 'string') {
    data.username = patch.username;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'password')) {
    data.password = patch.password ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'note')) {
    data.note = patch.note ?? null;
  }

  if (patch.status) {
    data.status = patch.status;
  }

  if (Object.keys(data).length === 0) {
    return mapCrawlAccount(existing);
  }

  const account = await prisma.crawlAccount.update({
    where: { id },
    data
  });
  return mapCrawlAccount(account);
}

export async function deleteCrawlerAccount(id: string): Promise<boolean> {
  const existing = await prisma.crawlAccount.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.crawlAccount.delete({ where: { id } });
  return true;
}

export async function registerCrawlerSession(
  id: string,
  _sessionId: string
): Promise<AdminAccount | null> {
  const existing = await prisma.crawlAccount.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const account = await prisma.crawlAccount.update({
    where: { id },
    data: {
      lastSessionAt: new Date(),
      status: 'ready'
    }
  });

  return mapCrawlAccount(account);
}
