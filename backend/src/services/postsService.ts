import { prisma } from '../db/client.js';
import { cacheKey, cacheTtlSeconds, clearCache, withCache } from '../utils/cache.js';
import { buildImgproxyUrl } from '../utils/imgproxy.js';
import { buildMediaUrl, isAbsoluteMediaBase } from '../utils/media.js';

export type ListPostsInput = {
  accountId?: string;
  cursor?: string;
  limit?: number;
  postedAtFrom?: string;
  postedAtTo?: string;
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
};

export type ListPostsResponse = {
  data: PostSummary[];
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
    limit,
    input.postedAtFrom ?? 'null',
    input.postedAtTo ?? 'null'
  ]);

  return withCache(cacheId, async () => {
    const where: Parameters<typeof prisma.post.findMany>[0]['where'] = {};

    if (input.accountId) {
      where.accountId = input.accountId;
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
      take: limit + 1,
      include: {
        media: { orderBy: { orderIndex: 'asc' } },
        tags: { select: { tag: true } },
        postText: true
      }
    };

    if (input.cursor) {
      queryArgs.cursor = { id: input.cursor };
      queryArgs.skip = 1;
    }

    const posts = await prisma.post.findMany(queryArgs) as PrismaPostWithRelations[];
    const hasNextPage = posts.length > limit;
    const trimmedPosts = hasNextPage ? posts.slice(0, limit) : posts;

    const data = trimmedPosts.map((post: PrismaPostWithRelations) => ({
      id: post.id,
      accountId: post.accountId,
      caption: post.caption,
      postedAt: post.postedAt.toISOString(),
      hasText: post.hasText,
      textContent: post.postText?.content ?? null,
      media: post.media.map((media) => mapMediaItem(post.accountId, media)),
      tags: post.tags.map((relation: PrismaTagRelation) => relation.tag.name)
    }));

    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? trimmedPosts[trimmedPosts.length - 1]?.id ?? null : null
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
        tags: post.tags.map((relation: PrismaTagRelation) => relation.tag.name)
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

function buildThumbnailUrl(mediaUrl: string, mime: string): string {
  const absoluteSource = isAbsoluteMediaBase() ? mediaUrl : null;
  if (absoluteSource) {
    const signed = buildImgproxyUrl(absoluteSource);
    if (signed) {
      return signed;
    }
  }

  if (mime.startsWith('video/')) {
    return mediaUrl;
  }

  return mediaUrl;
}

function mapMediaItem(accountId: string, media: PrismaMedia): MediaItem {
  const mediaUrl = buildMediaUrl(accountId, media.filename);
  const type = inferMediaType(media.mime);
  const thumbnailUrl = buildThumbnailUrl(mediaUrl, media.mime);

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
