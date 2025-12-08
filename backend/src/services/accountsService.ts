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

export type Account = AccountSummary & {
  username?: string;
  displayName?: string;
  profilePictures: {
    id: string;
    url: string;
    takenAt: string;
  }[];
};

export async function getAccount(id: string): Promise<Account | null> {
  const key = cacheKey(['accounts', id]);
  return withCache(
    key,
    async () => {
      const account = await prisma.account.findUnique({
        where: { id },
        include: {
          profilePics: {
            orderBy: { takenAt: 'desc' }
          },
          _count: {
            select: { posts: true }
          }
        }
      });

      if (!account) {
        return null;
      }
      
      let profileUrl = account.latestProfilePicUrl;
      if (profileUrl) {
        const source = `local:///${account.id}/${profileUrl}`;
        const signed = buildImagorUrl(source, {
          resize: { width: 300, height: 300, type: 'fill' }
        });
        if (signed) {
          profileUrl = signed;
        }
      }

      const profilePictures = account.profilePics?.map((pic) => {
        const source = `local:///${account.id}/${pic.filename}`;
        const signed = buildImagorUrl(source, {
          resize: { width: 150, height: 150, type: 'fill' }
        });
        return {
          id: pic.id,
          url: signed ?? '',
          takenAt: pic.takenAt.toISOString()
        };
      });

      return {
        id: account.id,
        latestProfilePicUrl: profileUrl,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        lastIndexedAt: account.lastIndexedAt
          ? account.lastIndexedAt.toISOString()
          : null,
        postCount: account.posts?.length ?? 0,
        username: account.id,
        displayName: account.id,
        profilePictures: profilePictures ?? []
      };
    },
    cacheTtlSeconds()
  );
}

export async function listAccounts(): Promise<Account[]> {
  const key = cacheKey(['accounts', 'list']);
  return withCache(
    key,
    async () => {
      const accounts = await prisma.account.findMany({
        orderBy: { id: 'asc' },
        include: {
          profilePics: {
            orderBy: { takenAt: 'desc' }
          },
          _count: {
            select: { posts: true }
          }
        }
      });

      return accounts.map((account) => {
        let profileUrl = account.latestProfilePicUrl;
        if (profileUrl) {
          const source = `local:///${account.id}/${profileUrl}`;
          const signed = buildImagorUrl(source, {
            resize: { width: 300, height: 300, type: 'fill' }
          });
          if (signed) {
            profileUrl = signed;
          }
        }

        const profilePictures = account.profilePics?.map((pic) => {
          const source = `local:///${account.id}/${pic.filename}`;
          const signed = buildImagorUrl(source, {
            resize: { width: 150, height: 150, type: 'fill' }
          });
          return {
            id: pic.id,
            url: signed ?? '',
            takenAt: pic.takenAt.toISOString()
          };
        });

        return {
          id: account.id,
          latestProfilePicUrl: profileUrl,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          lastIndexedAt: account.lastIndexedAt
            ? account.lastIndexedAt.toISOString()
            : null,
          postCount: account.posts?.length ?? 0,
          username: account.id,
          displayName: account.id,
          profilePictures: profilePictures ?? []
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

export async function deleteAccount(id: string): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Get all post IDs
    const posts = await tx.post.findMany({
      where: { accountId: id },
      select: { id: true }
    });
    const postIds = posts.map((p) => p.id);

    // 2. Delete Post relations
    if (postIds.length > 0) {
      await tx.media.deleteMany({
        where: { postId: { in: postIds } }
      });
      await tx.postText.deleteMany({
        where: { postId: { in: postIds } }
      });
      await tx.postTag.deleteMany({
        where: { postId: { in: postIds } }
      });
    }

    // 3. Delete Posts
    await tx.post.deleteMany({
      where: { accountId: id }
    });

    // 4. Delete ProfilePics
    await tx.profilePic.deleteMany({
      where: { accountId: id }
    });

    // 5. Get Highlight IDs
    const highlights = await tx.highlight.findMany({
      where: { accountId: id },
      select: { id: true }
    });
    const highlightIds = highlights.map((h) => h.id);

    // 6. Delete Highlight relations
    if (highlightIds.length > 0) {
      // First, we need to unset any coverMedia relations to avoid circular dependency issues if any
      // Actually, HighlightMedia depends on Highlight. Highlight depends on HighlightMedia (coverMedia).
      // We should set coverMediaId to null first.
      await tx.highlight.updateMany({
        where: { accountId: id },
        data: { coverMediaId: null }
      });

      await tx.highlightMedia.deleteMany({
        where: { highlightId: { in: highlightIds } }
      });
    }

    // 7. Delete Highlights
    await tx.highlight.deleteMany({
      where: { accountId: id }
    });

    // 8. Delete Account
    await tx.account.delete({
      where: { id }
    });
  });

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
