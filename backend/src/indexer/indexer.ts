import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '../db/client.js';
import { clearCache } from '../utils/cache.js';
import { resolveSourceRoot } from '../utils/sourceRoot.js';
import { scanDataRoot } from './fileSystemScanner.js';
import { IndexedPost, IndexerSnapshot } from './types.js';

export type IndexerOptions = {
  dataRoot?: string;
};

export type IndexerResult = {
  accountsCreated: number;
  postsCreated: number; // 신규 + 갱신 반영 건수
  mediaCreated: number; // 신규 + 갱신 반영 건수
  profilePicsSynced: number; // 신규 + 갱신 반영 건수
  tagsCreated: number;
};

function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => a.localeCompare(b));
}

function serializePost(post: IndexedPost): string {
  return JSON.stringify({
    postedAt: post.postedAt.toISOString(),
    caption: post.caption ?? null,
    hasText: post.hasText,
    type: post.type,
    textContent: post.textContent ?? '',
    tags: sortTags(post.tags),
    media: post.media
      .map((item) => ({
        orderIndex: item.orderIndex,
        filename: item.filename,
        mime: item.mime,
        width: item.width ?? null,
        height: item.height ?? null,
        duration: item.duration ?? null
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex || a.filename.localeCompare(b.filename))
  });
}

function serializeExistingPost(post: {
  postedAt: Date;
  caption: string | null;
  hasText: boolean;
  type: string;
  postText?: { content: string } | null;
  tags: { tag: { name: string } }[];
  media: {
    orderIndex: number;
    filename: string;
    mime: string;
    width: number | null;
    height: number | null;
    duration: number | null;
  }[];
}): string {
  return JSON.stringify({
    postedAt: post.postedAt.toISOString(),
    caption: post.caption ?? null,
    hasText: post.hasText,
    type: post.type,
    textContent: post.postText?.content ?? '',
    tags: sortTags(post.tags.map((item) => item.tag.name)),
    media: post.media
      .map((item) => ({
        orderIndex: item.orderIndex,
        filename: item.filename,
        mime: item.mime,
        width: item.width ?? null,
        height: item.height ?? null,
        duration: item.duration ?? null
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex || a.filename.localeCompare(b.filename))
  });
}

export async function buildSnapshot(options: IndexerOptions = {}): Promise<IndexerSnapshot> {
  const dataRoot = options.dataRoot ?? resolveSourceRoot();
  const resolvedRoot = path.resolve(dataRoot);

  try {
    const stats = await fs.stat(resolvedRoot);
    if (!stats.isDirectory()) {
      throw new Error('not-a-directory');
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Indexer data root is not accessible: ${resolvedRoot} (${reason})`);
  }

  return scanDataRoot(resolvedRoot);
}

export async function syncSnapshotToDatabase(snapshot: IndexerSnapshot): Promise<IndexerResult> {
  const now = new Date();
  const stats: IndexerResult = {
    accountsCreated: 0,
    postsCreated: 0,
    mediaCreated: 0,
    profilePicsSynced: 0,
    tagsCreated: 0
  };

  for (const account of snapshot.accounts) {
    const existingAccount = await prisma.account.findUnique({ where: { id: account.id } });
    if (!existingAccount) {
      stats.accountsCreated += 1;
    }

    const latestProfilePicUrl = account.profilePictures.at(-1)?.filename ?? null;

    await prisma.account.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        latestProfilePicUrl,
        lastIndexedAt: now,
        updatedAt: now
      },
      update: {
        latestProfilePicUrl,
        lastIndexedAt: now,
        updatedAt: now
      }
    });

    const snapshotPostIds = new Set(account.posts.map((post) => post.id));
    const existingPosts = await prisma.post.findMany({
      where: { accountId: account.id },
      include: {
        media: true,
        postText: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    const existingPostsById = new Map(existingPosts.map((post) => [post.id, post]));
    const deletedPostIds = existingPosts
      .filter((post) => !snapshotPostIds.has(post.id))
      .map((post) => post.id);

    if (deletedPostIds.length > 0) {
      await prisma.post.deleteMany({ where: { id: { in: deletedPostIds } } });
    }

    const postsToSync = account.posts.filter((post) => {
      const existing = existingPostsById.get(post.id);
      if (!existing) {
        return true;
      }

      return serializePost(post) !== serializeExistingPost(existing);
    });

    const tagNames = new Set<string>();
    for (const post of postsToSync) {
      for (const tag of post.tags) {
        tagNames.add(tag);
      }
    }

    let tagNameToId = new Map<string, number>();
    if (tagNames.size > 0) {
      const names = [...tagNames];
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true }
      });
      const missingTagNames = names.filter(
        (name) => !existingTags.some((existingTag) => existingTag.name === name)
      );

      if (missingTagNames.length > 0) {
        await prisma.tag.createMany({
          data: missingTagNames.map((name) => ({ name })),
          skipDuplicates: true
        });
        stats.tagsCreated += missingTagNames.length;
      }

      const resolvedTags = await prisma.tag.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true }
      });
      tagNameToId = new Map(resolvedTags.map((tag) => [tag.name, tag.id]));
    }

    for (const post of postsToSync) {
      await prisma.$transaction(async (tx) => {
        await tx.post.upsert({
          where: { id: post.id },
          create: {
            id: post.id,
            accountId: post.accountId,
            postedAt: post.postedAt,
            caption: post.caption,
            hasText: post.hasText,
            type: post.type
          },
          update: {
            postedAt: post.postedAt,
            caption: post.caption,
            hasText: post.hasText,
            type: post.type
          }
        });

        await tx.postText.upsert({
          where: { postId: post.id },
          create: { postId: post.id, content: post.textContent ?? '' },
          update: { content: post.textContent ?? '' }
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
          stats.mediaCreated += post.media.length;
        }

        await tx.postTag.deleteMany({ where: { postId: post.id } });
        const tagIds = post.tags
          .map((tagName) => tagNameToId.get(tagName))
          .filter((value): value is number => value !== undefined);
        if (tagIds.length > 0) {
          await tx.postTag.createMany({
            data: tagIds.map((tagId) => ({ postId: post.id, tagId })),
            skipDuplicates: true
          });
        }
      }, { timeout: 30000 });

      stats.postsCreated += 1;
    }

    const existingProfilePics = await prisma.profilePic.findMany({
      where: { accountId: account.id },
      select: { id: true, takenAt: true, filename: true }
    });
    const existingProfilePicsById = new Map(existingProfilePics.map((item) => [item.id, item]));
    const existingProfilePicIds = new Set(existingProfilePicsById.keys());
    const snapshotProfilePicsById = new Map(account.profilePictures.map((item) => [item.id, item]));
    const snapshotProfilePicIds = new Set(snapshotProfilePicsById.keys());
    const removedProfilePicIds = [...existingProfilePicIds].filter((id) => !snapshotProfilePicIds.has(id));
    if (removedProfilePicIds.length > 0) {
      await prisma.profilePic.deleteMany({ where: { id: { in: removedProfilePicIds } } });
    }

    for (const picture of snapshotProfilePicsById.values()) {
      const existingPicture = existingProfilePicsById.get(picture.id);
      if (!existingPicture) {
        await prisma.profilePic.create({
          data: {
            id: picture.id,
            accountId: picture.accountId,
            takenAt: picture.takenAt,
            filename: picture.filename
          }
        });
        stats.profilePicsSynced += 1;
        continue;
      }

      if (existingPicture.filename !== picture.filename || existingPicture.takenAt.getTime() !== picture.takenAt.getTime()) {
        await prisma.profilePic.update({
          where: { id: picture.id },
          data: {
            takenAt: picture.takenAt,
            filename: picture.filename
          }
        });
        stats.profilePicsSynced += 1;
      }
    }

    // Sync Highlights
    for (const highlight of account.highlights) {
      const savedHighlight = await prisma.highlight.upsert({
        where: {
          accountId_title: {
            accountId: account.id,
            title: highlight.title
          }
        },
        create: {
          accountId: account.id,
          title: highlight.title
        },
        update: {
          coverMediaId: null
        }
      });

      await prisma.highlightMedia.deleteMany({ where: { highlightId: savedHighlight.id } });

      if (highlight.media.length > 0) {
        await prisma.highlightMedia.createMany({
          data: highlight.media.map((media) => ({
            highlightId: savedHighlight.id,
            filename: media.filename,
            mime: media.mime,
            orderIndex: media.orderIndex
          }))
        });
      }

      if (highlight.coverMedia) {
        const cover = await prisma.highlightMedia.create({
          data: {
            highlightId: savedHighlight.id,
            filename: highlight.coverMedia.filename,
            mime: highlight.coverMedia.mime,
            orderIndex: highlight.coverMedia.orderIndex
          }
        });

        await prisma.highlight.update({
          where: { id: savedHighlight.id },
          data: { coverMediaId: cover.id }
        });
      }
    }

    const existingHighlights = await prisma.highlight.findMany({
      where: { accountId: account.id },
      select: { id: true, title: true }
    });
    const snapshotHighlightTitles = new Set(account.highlights.map((highlight) => highlight.title));
    const removedHighlightIds = existingHighlights
      .filter((highlight) => !snapshotHighlightTitles.has(highlight.title))
      .map((highlight) => highlight.id);
    if (removedHighlightIds.length > 0) {
      await prisma.highlight.deleteMany({ where: { id: { in: removedHighlightIds } } });
    }
  }

  await clearCache();

  return stats;
}

export async function indexFileSystem(options: IndexerOptions = {}): Promise<IndexerResult> {
  const snapshot = await buildSnapshot(options);
  return syncSnapshotToDatabase(snapshot);
}
