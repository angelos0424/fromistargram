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
        const source = `local:///source/${account.id}/${profileUrl}`;
        const signed = buildImagorUrl(source, {
          resize: { width: 300, height: 300, type: 'fill' }
        });
        if (signed) {
          profileUrl = signed;
        }
      }

      const profilePictures = account.profilePics?.map((pic) => {
        const source = `local:///source/${account.id}/${pic.filename}`;
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
          const source = `local:///source/${account.id}/${profileUrl}`;
          const signed = buildImagorUrl(source, {
            resize: { width: 300, height: 300, type: 'fill' }
          });
          if (signed) {
            profileUrl = signed;
          }
        }

        const profilePictures = account.profilePics?.map((pic) => {
          const source = `local:///source/${account.id}/${pic.filename}`;
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

export async function deleteAccount(id: string): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return false;
  }

  await prisma.account.delete({ where: { id } });
  return true;
}
