import path from 'path';
import { prisma } from '../db/client.js';
import { clearCache } from '../utils/cache.js';
import { scanDataRoot } from './fileSystemScanner.js';
import { IndexerSnapshot } from './types.js';

export type IndexerOptions = {
  dataRoot?: string;
};

export type IndexerResult = {
  accountsCreated: number;
  postsCreated: number;
  mediaCreated: number;
  profilePicsCreated: number;
  tagsCreated: number;
};

export async function buildSnapshot(options: IndexerOptions = {}): Promise<IndexerSnapshot> {
  const dataRoot = options.dataRoot ?? process.env.DATA_ROOT ?? '/root';
  return scanDataRoot(path.resolve(dataRoot));
}

export async function syncSnapshotToDatabase(snapshot: IndexerSnapshot): Promise<IndexerResult> {
  const now = new Date();
  const stats: IndexerResult = {
    accountsCreated: 0,
    postsCreated: 0,
    mediaCreated: 0,
    profilePicsCreated: 0,
    tagsCreated: 0
  };

  await prisma.$transaction(async (tx: any) => {
    for (const account of snapshot.accounts) {
      const existingAccount = await tx.account.findUnique({ where: { id: account.id } });
      if (!existingAccount) {
        await tx.account.create({
          data: {
            id: account.id,
            latestProfilePicUrl: account.profilePictures.at(-1)?.filename ?? null,
            lastIndexedAt: now
          }
        });
        stats.accountsCreated += 1;
      } else {
        await tx.account.update({
          where: { id: account.id },
          data: {
            latestProfilePicUrl: account.profilePictures.at(-1)?.filename ?? null,
            updatedAt: now,
            lastIndexedAt: now
          }
        });
      }

      for (const post of account.posts) {
        const existingPost = await tx.post.findUnique({ where: { id: post.id } });
        const isNewPost = !existingPost;
        if (!existingPost) {
          await tx.post.create({
            data: {
              id: post.id,
              accountId: post.accountId,
              postedAt: post.postedAt,
              caption: post.caption,
              hasText: post.hasText
            }
          });
          stats.postsCreated += 1;
        } else {
          await tx.post.update({
            where: { id: post.id },
            data: {
              caption: post.caption,
              postedAt: post.postedAt,
              hasText: post.hasText,
              updatedAt: new Date()
            }
          });
        }

        await tx.media.deleteMany({ where: { postId: post.id } });
        if (post.media.length > 0) {
          await tx.media.createMany({
            data: post.media.map((media) => ({
              postId: post.id,
              orderIndex: media.orderIndex,
              filename: media.filename,
              mime: media.mime,
              width: media.width,
              height: media.height,
              duration: media.duration
            }))
          });
          if (isNewPost) {
            stats.mediaCreated += post.media.length;
          }
        }

        await tx.postTag.deleteMany({ where: { postId: post.id } });
        for (const tagName of post.tags) {
          let tag = await tx.tag.findUnique({ where: { name: tagName } });
          if (!tag) {
            tag = await tx.tag.create({ data: { name: tagName } });
            stats.tagsCreated += 1;
          }

          await tx.postTag.create({
            data: {
              postId: post.id,
              tagId: tag.id
            }
          });
        }

        await tx.postText.upsert({
          where: { postId: post.id },
          create: {
            postId: post.id,
            content: post.textContent ?? ''
          },
          update: {
            content: post.textContent ?? ''
          }
        });
      }

      await tx.profilePic.deleteMany({ where: { accountId: account.id } });
      if (account.profilePictures.length > 0) {
        const profilePicResult = await tx.profilePic.createMany({
          data: account.profilePictures.map((picture) => ({
            id: picture.id,
            accountId: picture.accountId,
            takenAt: picture.takenAt,
            filename: picture.filename
          }))
        });
        if (!existingAccount) {
          stats.profilePicsCreated += profilePicResult.count ?? account.profilePictures.length;
        }
      }
    }
  });

  await clearCache();

  return stats;
}

export async function indexFileSystem(options: IndexerOptions = {}): Promise<IndexerResult> {
  const snapshot = await buildSnapshot(options);
  return syncSnapshotToDatabase(snapshot);
}
