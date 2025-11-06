import path from 'path';
import { prisma } from '../db/client.js';
import { clearCache } from '../utils/cache.js';
import { scanDataRoot } from './fileSystemScanner.js';
import { IndexerSnapshot } from './types.js';

export type IndexerOptions = {
  dataRoot?: string;
};

export async function buildSnapshot(options: IndexerOptions = {}): Promise<IndexerSnapshot> {
  const dataRoot = options.dataRoot ?? process.env.DATA_ROOT ?? '/root';
  return scanDataRoot(path.resolve(dataRoot));
}

export async function syncSnapshotToDatabase(snapshot: IndexerSnapshot): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx: any) => {
    for (const account of snapshot.accounts) {
      await tx.account.upsert({
        where: { id: account.id },
        create: {
          id: account.id,
          latestProfilePicUrl: account.profilePictures.at(-1)?.filename ?? null,
          lastIndexedAt: now
        },
        update: {
          latestProfilePicUrl: account.profilePictures.at(-1)?.filename ?? null,
          updatedAt: now,
          lastIndexedAt: now
        }
      });

      for (const post of account.posts) {
        await tx.post.upsert({
          where: { id: post.id },
          create: {
            id: post.id,
            accountId: post.accountId,
            postedAt: post.postedAt,
            caption: post.caption,
            hasText: post.hasText
          },
          update: {
            caption: post.caption,
            postedAt: post.postedAt,
            hasText: post.hasText,
            updatedAt: new Date()
          }
        });

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
        }

        await tx.postTag.deleteMany({ where: { postId: post.id } });
        for (const tagName of post.tags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            create: { name: tagName }
          });

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
        await tx.profilePic.createMany({
          data: account.profilePictures.map((picture) => ({
            id: picture.id,
            accountId: picture.accountId,
            takenAt: picture.takenAt,
            filename: picture.filename
          }))
        });
      }
    }
  });

  await clearCache();
}

export async function indexFileSystem(options: IndexerOptions = {}): Promise<void> {
  const snapshot = await buildSnapshot(options);
  await syncSnapshotToDatabase(snapshot);
}
