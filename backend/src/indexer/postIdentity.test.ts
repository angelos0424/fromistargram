import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndexedPost } from './types.js';

type StoredPost = Omit<IndexedPost, 'tags' | 'textContent'> & {
  tags: { tag: { name: string } }[];
  postText: { content: string } | null;
};
const state = vi.hoisted(() => ({ posts: new Map<string, StoredPost>() }));
vi.mock('../db/client.js', () => {
  const post = {
    findMany: vi.fn(async ({ where }: { where: { accountId: string } }) =>
      [...state.posts.values()].filter((row) => row.accountId === where.accountId)),
    upsert: vi.fn(async ({ where, create, update }: { where: { id: string }; create: StoredPost; update: Partial<StoredPost> }) => {
      const old = state.posts.get(where.id);
      const row = old ? { ...old, ...update } : { ...create, media: [], tags: [], postText: null };
      state.posts.set(row.id, row);
      return row;
    }),
    deleteMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
      for (const id of where.id.in) state.posts.delete(id);
    })
  };
  const prisma = {
    account: { findUnique: vi.fn(async () => ({})), upsert: vi.fn(async () => ({})) },
    post,
    media: {
      deleteMany: vi.fn(async ({ where }: { where: { postId: string | { in: string[] } } }) => {
        const ids = typeof where.postId === 'string' ? [where.postId] : where.postId.in;
        for (const id of ids) { const row = state.posts.get(id); if (row) row.media = []; }
      }),
      createMany: vi.fn(async ({ data }: { data: (IndexedPost['media'][number] & { postId: string })[] }) => {
        for (const media of data) state.posts.get(media.postId)!.media.push(media);
      })
    },
    postText: {
      deleteMany: vi.fn(async () => ({})),
      upsert: vi.fn(async ({ create }: { create: { postId: string; content: string } }) => {
        state.posts.get(create.postId)!.postText = { content: create.content };
      })
    },
    postTag: { deleteMany: vi.fn(async () => ({})) },
    profilePic: { findMany: vi.fn(async () => []) },
    highlight: { findMany: vi.fn(async () => []) }
  };
  return {
    prisma: {
      ...prisma,
      $transaction: vi.fn(async (operation: ((tx: typeof prisma) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof operation === 'function' ? operation(prisma) : Promise.all(operation))
    }
  };
});
vi.mock('../utils/cache.js', () => ({ clearCache: vi.fn(async () => undefined) }));

import { scanDataRoot } from './fileSystemScanner.js';
import { syncSnapshotToDatabase } from './indexer.js';
import { buildPostId } from './postIdentity.js';

let root: string;
const timestamp = '2026-10-23_03-00-00';

beforeEach(async () => {
  state.posts.clear();
  root = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-post-identity-'));
  for (const accountId of ['account_a', 'account_b']) {
    await mkdir(path.join(root, accountId));
    await writeFile(path.join(root, accountId, `${timestamp}_UTC.jpg`), accountId);
    await writeFile(path.join(root, accountId, `${timestamp}_UTC.txt`), `caption ${accountId}`);
  }
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('account-scoped post synchronization', () => {
  it('keeps two accounts posting in the same second separate and is idempotent', async () => {
    const snapshot = await scanDataRoot(root);
    await syncSnapshotToDatabase(snapshot);
    expect(state.posts.size).toBe(2);
    for (const accountId of ['account_a', 'account_b']) {
      expect(state.posts.get(buildPostId(accountId, timestamp))).toMatchObject({
        accountId, caption: `caption ${accountId}`, postText: { content: `caption ${accountId}` },
        media: [{ postId: buildPostId(accountId, timestamp), filename: `${timestamp}_UTC.jpg` }]
      });
    }
    expect((await syncSnapshotToDatabase(snapshot)).postsCreated).toBe(0);
  });

  it('repairs the original owner while preserving its legacy URL and independent deletion', async () => {
    const legacyId = `${timestamp}_UTC`;
    state.posts.set(legacyId, {
      id: legacyId, accountId: 'account_a', postedAt: new Date('2026-10-23T03:00:00Z'),
      type: 'Post', caption: 'incorrect account_b caption', hasText: true,
      postText: { content: 'incorrect account_b content' }, media: [], tags: []
    });
    const snapshot = await scanDataRoot(root);
    await syncSnapshotToDatabase(snapshot);
    expect(state.posts.size).toBe(2);
    expect(state.posts.get(legacyId)).toMatchObject({ accountId: 'account_a', caption: 'caption account_a' });
    expect(state.posts.has(buildPostId('account_a', timestamp))).toBe(false);
    expect(state.posts.get(buildPostId('account_b', timestamp))).toMatchObject({ accountId: 'account_b', caption: 'caption account_b' });
    expect((await syncSnapshotToDatabase(snapshot)).postsCreated).toBe(0);

    const removed = { accounts: snapshot.accounts.map((account) => account.id === 'account_a' ? { ...account, posts: [] } : account) };
    await syncSnapshotToDatabase(removed);
    expect(state.posts.has(legacyId)).toBe(false);
    expect(state.posts.size).toBe(1);
    expect(state.posts.has(buildPostId('account_b', timestamp))).toBe(true);
  });
});
