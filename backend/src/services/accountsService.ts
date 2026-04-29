import { mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '../db/client.js';
import { cacheKey, cacheTtlSeconds, clearCache, withCache } from '../utils/cache.js';
import { buildImagorUrl } from '../utils/imagor.js';
import { resolveSourceAccountPath, resolveSourceRoot } from '../utils/sourceRoot.js';

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

export type CreateAccountInput = {
  id: string;
};

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function normalizeAccountId(id: string): string {
  return id.trim().replace(/^@+/, '');
}

function assertValidAccountId(id: string): void {
  if (!id || id.length > 128) {
    throw new Error('Account id must be between 1 and 128 characters.');
  }

  if (
    !ACCOUNT_ID_PATTERN.test(id) ||
    id.includes('..') ||
    id.includes('/') ||
    id.includes('\\') ||
    path.isAbsolute(id)
  ) {
    throw new Error('Account id can only contain letters, numbers, dots, underscores, and hyphens.');
  }
}

function resolveSafeAccountPath(accountId: string): string {
  const sourceRoot = resolveSourceRoot();
  const accountPath = resolveSourceAccountPath(accountId);
  const isInsideRoot =
    accountPath === sourceRoot || accountPath.startsWith(`${sourceRoot}${path.sep}`);

  if (!isInsideRoot) {
    throw new Error('Account path escapes source root.');
  }

  return accountPath;
}

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

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const id = normalizeAccountId(input.id);
  assertValidAccountId(id);

  const existing = await prisma.account.findUnique({ where: { id } });
  if (existing) {
    throw new Error('Account already exists.');
  }

  await mkdir(resolveSafeAccountPath(id), { recursive: true });

  await prisma.account.upsert({
    where: { id },
    create: {
      id,
      lastIndexedAt: null,
      latestProfilePicUrl: null
    },
    update: {}
  });

  await clearCache();

  const account = await getAccount(id);
  if (!account) {
    throw new Error('Failed to load created account.');
  }

  return account;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return false;
  }

  await prisma.account.delete({ where: { id } });
  await clearCache();
  return true;
}
