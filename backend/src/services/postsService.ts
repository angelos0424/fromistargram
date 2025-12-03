import { prisma } from '../db/client.js';
import { cacheKey, cacheTtlSeconds, clearCache, withCache } from '../utils/cache.js';
import { buildImagorUrl } from '../utils/imagor.js';
import { buildMediaUrl } from '../utils/media.js';

export type ListPostsInput = {
  accountId?: string;
  cursor?: string;
  limit?: number;
  postedAtFrom?: string;
  postedAtTo?: string;
  page?: number;
  type?: string;
};

export type MediaItem = {
  id: string;
  orderIndex: number;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  type: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl: string;
};

export type PostSummary = {
  id: string;
  accountId: string;
  caption: string | null;
  postedAt: string;
  hasText: boolean;
  textContent: string | null;
  media: MediaItem[];
  tags: string[];
  type: string;
};

export type ListPostsResponse = {
  data: PostSummary[];
  total: number;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

const DEFAULT_LIMIT = 20;

type PrismaTagRelation = { tag: { name: string } };

type PrismaPostWithRelations = {
  id: string;
  accountId: string;
  caption: string | null;
  postedAt: Date;
  hasText: boolean;
  type: string;
  postText: { content: string } | null;
  media: PrismaMedia[];
  tags: PrismaTagRelation[];
};

export async function listPosts(input: ListPostsInput): Promise<ListPostsResponse> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const cacheId = cacheKey([
    'posts',
    input.accountId ?? 'all',
    input.cursor ?? 'start',
    input.page ?? 'null',
    limit,
    input.postedAtFrom ?? 'null',
    input.postedAtTo ?? 'null',
    input.type ?? 'all'
  ]);

  return withCache(cacheId, async () => {
    const where: Parameters<typeof prisma.post.findMany>[0]['where'] = {};

    if (input.accountId) {
      where.accountId = input.accountId;
    }

    if (input.type) {
      where.type = input.type;
    }

    if (input.postedAtFrom || input.postedAtTo) {
      where.postedAt = {
        gte: input.postedAtFrom ? new Date(input.postedAtFrom) : undefined,
        lte: input.postedAtTo ? new Date(input.postedAtTo) : undefined
      };
    }

    const queryArgs: Parameters<typeof prisma.post.findMany>[0] = {
      where,
      orderBy: { postedAt: 'desc' },
      include: {
        media: { orderBy: { orderIndex: 'asc' } },
        tags: { select: { tag: true } },
        postText: true
      }
    };

    if (input.cursor) {
      queryArgs.take = limit + 1;
      queryArgs.cursor = { id: input.cursor };
      queryArgs.skip = 1;
    } else {
      queryArgs.take = limit + 1;
      if (input.page && input.page > 1) {
        queryArgs.skip = (input.page - 1) * limit;
      }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany(queryArgs),
      prisma.post.count({ where })
    ]);
    const hasNextPage = posts.length > limit;
    const trimmedPosts = hasNextPage ? posts.slice(0, limit) : posts;
    const nextCursor = hasNextPage ? trimmedPosts[trimmedPosts.length - 1]?.id ?? null : null;

    const data = trimmedPosts.map((post) => ({
      id: post.id,
      accountId: post.accountId,
      caption: post.caption,
      postedAt: post.postedAt.toISOString(),
      hasText: post.hasText,
      textContent: post.postText?.content ?? null,
      media: post.media.map((media) => mapMediaItem(post.accountId, media)),
      tags: post.tags.map((relation) => relation.tag.name),
      type: post.type
    }));

    return {
      data,
      total,
      pageInfo: {
        hasNextPage,
        nextCursor
      }
    } satisfies ListPostsResponse;
  }, cacheTtlSeconds());
}

export async function getPostById(id: string): Promise<PostSummary | null> {
  const key = cacheKey(['post', id]);
  return withCache(
    key,
    async () => {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          media: { orderBy: { orderIndex: 'asc' } },
          tags: { select: { tag: true } },
          postText: true
        }
      }) as PrismaPostWithRelations | null;

      if (!post) {
        return null;
      }

      return {
        id: post.id,
        accountId: post.accountId,
        caption: post.caption,
        postedAt: post.postedAt.toISOString(),
        hasText: post.hasText,
        textContent: post.postText?.content ?? null,
        media: post.media.map((media) => mapMediaItem(post.accountId, media)),
        tags: post.tags.map((relation: PrismaTagRelation) => relation.tag.name),
        type: post.type
      } satisfies PostSummary;
    },
    cacheTtlSeconds()
  );
}

type PrismaMedia = {
  id: string;
  orderIndex: number;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
};

function inferMediaType(mime: string): 'image' | 'video' {
  if (mime.startsWith('video/')) {
    return 'video';
  }
  return 'image';
}

function buildThumbnailUrl(accountId: string, filename: string, mime: string): string {
  const source = `local:///${accountId}/${filename}`;

  // If it's a video, we might want to let imgproxy attempt to extract a frame
  // or just return the raw video URL if imgproxy isn't configured for video.
  // For now, assuming imgproxy can handle the file or we fallback.

  const signed = buildImagorUrl(source);
  if (signed) {
    return signed;
  }

  // Fallback if imgproxy not configured
  return buildMediaUrl(accountId, filename);
}

function mapMediaItem(accountId: string, media: PrismaMedia): MediaItem {
  const mediaUrl = buildMediaUrl(accountId, media.filename);
  const type = inferMediaType(media.mime);

  // Use the new logic to generate signed imgproxy URL
  const thumbnailUrl = buildThumbnailUrl(accountId, media.filename, media.mime);

  return {
    id: media.id,
    orderIndex: media.orderIndex,
    filename: media.filename,
    mime: media.mime,
    width: media.width,
    height: media.height,
    duration: media.duration,
    type,
    mediaUrl,
    thumbnailUrl
  };
}

export async function invalidatePostCaches(): Promise<void> {
  await clearCache();
}
