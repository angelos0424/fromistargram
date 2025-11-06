import { prisma } from '../db/client.js';

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
};

export type PostSummary = {
  id: string;
  accountId: string;
  caption: string | null;
  postedAt: Date;
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

export async function listPosts(input: ListPostsInput): Promise<ListPostsResponse> {
  const limit = input.limit ?? DEFAULT_LIMIT;
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

  const posts = await prisma.post.findMany(queryArgs);
  const hasNextPage = posts.length > limit;
  const trimmedPosts = hasNextPage ? posts.slice(0, limit) : posts;

  const data = trimmedPosts.map((post) => ({
    id: post.id,
    accountId: post.accountId,
    caption: post.caption,
    postedAt: post.postedAt,
    hasText: post.hasText,
    textContent: post.postText?.content ?? null,
    media: post.media.map((media) => ({
      id: media.id,
      orderIndex: media.orderIndex,
      filename: media.filename,
      mime: media.mime,
      width: media.width,
      height: media.height,
      duration: media.duration
    })),
    tags: post.tags.map((relation) => relation.tag.name)
  }));

  return {
    data,
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? trimmedPosts[trimmedPosts.length - 1]?.id ?? null : null
    }
  };
}

export async function getPostById(id: string): Promise<PostSummary | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      media: { orderBy: { orderIndex: 'asc' } },
      tags: { select: { tag: true } },
      postText: true
    }
  });

  if (!post) {
    return null;
  }

  return {
    id: post.id,
    accountId: post.accountId,
    caption: post.caption,
    postedAt: post.postedAt,
    hasText: post.hasText,
    textContent: post.postText?.content ?? null,
    media: post.media.map((media) => ({
      id: media.id,
      orderIndex: media.orderIndex,
      filename: media.filename,
      mime: media.mime,
      width: media.width,
      height: media.height,
      duration: media.duration
    })),
    tags: post.tags.map((relation) => relation.tag.name)
  };
}
