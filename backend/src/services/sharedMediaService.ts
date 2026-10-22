import { unlink } from 'fs/promises';
import path from 'path';
import type { SharedMedia } from '@prisma/client';
import { prisma } from '../db/client.js';
import { buildDateRange } from '../utils/dateRange.js';
import { getUploadPath } from '../utils/fileUpload.js';

// Extract Prisma types from client instance
type PrismaSharedMediaWhereInput = Parameters<typeof prisma.sharedMedia.findMany>[0]['where'];

export interface CreateSharedMediaInput {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  accountName?: string;
  caption?: string;
  uploadBatchId?: string;
  uploadedAt?: Date;
}

export interface ListSharedMediaParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
  sort?: 'newest' | 'oldest';
  page?: number;
  search?: string;
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
      accountName: input.accountName,
      caption: input.caption,
      uploadBatchId: input.uploadBatchId,
      uploadedAt: input.uploadedAt
    }
  });
}

export async function listSharedMedia(params: ListSharedMediaParams) {
  const limit = params.limit ?? 20;
  const sortDirection = params.sort === 'oldest' ? 'asc' : 'desc';
  const where: PrismaSharedMediaWhereInput = {};

  if (!params.includeDeleted) {
    where.isDeleted = false;
  }

  if (params.from || params.to) {
    where.uploadedAt = buildDateRange(params.from, params.to);
  }

  // Select groups by matching members, then return the complete matching group.
  const groupWhere = { ...where };
  const search = params.search?.trim();
  if (search) {
    const contains = { contains: search, mode: 'insensitive' as const };
    where.OR = [
      { caption: contains },
      { accountName: contains },
      { originalName: contains },
      { filename: contains }
    ];
  }

  // Page-based group browsing takes precedence when both pagination modes are
  // supplied; cursor pagination is used only for individual media listings.
  if (params.page) {
    return listSharedMediaGroups({
      limit,
      page: params.page,
      sortDirection,
      where,
      groupWhere
    });
  }

  const queryArgs: Parameters<typeof prisma.sharedMedia.findMany>[0] = {
    where,
    orderBy: [{ uploadedAt: sortDirection }, { id: sortDirection }],
    take: limit + 1
  };

  if (params.cursor) {
    queryArgs.cursor = { id: params.cursor };
    queryArgs.skip = 1;
  }

  const [items, total] = await Promise.all([
    prisma.sharedMedia.findMany(queryArgs),
    prisma.sharedMedia.count({ where })
  ]);

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    data,
    hasMore,
    nextCursor,
    total
  };
}

async function listSharedMediaGroups({
  limit,
  page,
  sortDirection,
  where,
  groupWhere
}: {
  limit: number;
  page: number;
  sortDirection: 'asc' | 'desc';
  where: PrismaSharedMediaWhereInput;
  groupWhere: PrismaSharedMediaWhereInput;
}) {
  const candidates = await prisma.sharedMedia.findMany({
    where,
    orderBy: [{ uploadedAt: sortDirection }, { id: sortDirection }],
    select: {
      id: true,
      uploadBatchId: true,
      uploadedAt: true
    }
  }) as Pick<SharedMedia, 'id' | 'uploadBatchId' | 'uploadedAt'>[];

  const groupKeys: string[] = [];
  const seen = new Set<string>();

  for (const item of candidates) {
    const key = getSharedMediaGroupKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      groupKeys.push(key);
    }
  }

  const offset = (page - 1) * limit;
  const pageGroupKeys = groupKeys.slice(offset, offset + limit);
  const batchIds = pageGroupKeys
    .filter((key) => key.startsWith('batch:'))
    .map((key) => key.slice('batch:'.length));
  const legacyIds = pageGroupKeys
    .filter((key) => key.startsWith('legacy:'))
    .map((key) => key.slice('legacy:'.length));

  const pageWhere: PrismaSharedMediaWhereInput = {
    AND: [
      groupWhere,
      {
        OR: [
          ...(batchIds.length ? [{ uploadBatchId: { in: batchIds } }] : []),
          ...(legacyIds.length ? [{ id: { in: legacyIds } }] : [])
        ]
      }
    ]
  };

  const pageItems = pageGroupKeys.length
    ? await prisma.sharedMedia.findMany({
        where: pageWhere,
        orderBy: [{ uploadedAt: sortDirection }, { id: sortDirection }]
      })
    : [];

  const itemsByGroup = new Map<string, SharedMedia[]>();
  for (const item of pageItems) {
    const key = getSharedMediaGroupKey(item);
    const groupItems = itemsByGroup.get(key) ?? [];
    groupItems.push(item);
    itemsByGroup.set(key, groupItems);
  }

  const data = pageGroupKeys.flatMap((key) => itemsByGroup.get(key) ?? []);
  const hasMore = offset + limit < groupKeys.length;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data,
    hasMore,
    nextCursor,
    total: groupKeys.length
  };
}

function getSharedMediaGroupKey(media: Pick<SharedMedia, 'id' | 'uploadBatchId'>) {
  return media.uploadBatchId ? `batch:${media.uploadBatchId}` : `legacy:${media.id}`;
}

export async function getSharedMediaById(id: string) {
  return await prisma.sharedMedia.findUnique({
    where: { id }
  });
}

export async function updateSharedMediaCaption(id: string, caption: string | null) {
  return await prisma.sharedMedia.update({
    where: { id },
    data: { caption }
  });
}

export async function softDeleteSharedMedia(id: string) {
  const media = await prisma.sharedMedia.findUnique({
    where: { id }
  });

  if (!media) {
    return null;
  }

  if (!media.isDeleted) {
    const uploadDir = getUploadPath(media.uploadedAt);
    const filepath = path.join(uploadDir, media.filename);

    try {
      await unlink(filepath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    return await prisma.sharedMedia.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  return media;
}
