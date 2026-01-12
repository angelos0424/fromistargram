import { prisma } from '../db/client.js';

export interface CreateSharedMediaInput {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  uploadBatchId?: string;
}

export interface ListSharedMediaParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

export async function createSharedMedia(input: CreateSharedMediaInput) {
  return await prisma.sharedMedia.create({
    data: {
      filename: input.filename,
      originalName: input.originalName,
      mime: input.mime,
      size: input.size,
      width: input.width,
      height: input.height,
      duration: input.duration,
      caption: input.caption,
      uploadBatchId: input.uploadBatchId
    }
  });
}

export async function listSharedMedia(params: ListSharedMediaParams) {
  const limit = params.limit ?? 20;
  const where: any = {};

  if (params.from || params.to) {
    where.uploadedAt = {};
    if (params.from) {
      where.uploadedAt.gte = new Date(params.from);
    }
    if (params.to) {
      where.uploadedAt.lte = new Date(params.to);
    }
  }

  if (params.cursor) {
    where.id = { lt: params.cursor };
  }

  const items = await prisma.sharedMedia.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
    take: limit + 1
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    data,
    hasMore,
    nextCursor
  };
}

export async function getSharedMediaById(id: string) {
  return await prisma.sharedMedia.findUnique({
    where: { id }
  });
}
