import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { constants } from 'node:fs';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createSharedMedia,
  listSharedMedia,
  getSharedMediaById
} from '../services/sharedMediaService.js';
import { getUploadPath } from '../utils/fileUpload.js';
import { acquireUploadSlot, stageUpload, StagedUpload, UploadError } from '../utils/stagedUpload.js';
import { isValidDateFilter } from '../utils/dateRange.js';
import { formatDateToYYYYMMDD } from '../utils/dateFormat.js';
import { sendSuccess, sendError } from '../utils/response.js';

function getApiBaseUrl(request: { headers: Record<string, string | string[] | undefined>; protocol?: string }): string {
  const publicApiUrl = process.env.PUBLIC_API_BASE_URL;
  if (publicApiUrl) {
    return publicApiUrl;
  }

  const forwardedProto = request.headers['x-forwarded-proto'];
  const forwardedHost = request.headers['x-forwarded-host'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto ?? request.protocol ?? 'http';
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost ?? request.headers.host;
  return host ? `${protocol}://${host}` : '';
}

function buildUploadedMediaUrl(apiBaseUrl: string, yyyyMMdd: string, filename: string): string {
  return `${apiBaseUrl}/api/media/uploaded/${yyyyMMdd}/${filename}`;
}

function buildUploadedThumbnailUrl(apiBaseUrl: string, yyyyMMdd: string, filename: string, mediaUrl: string): string {
  // image-proxy를 통해 imagor로 접근 (base64 인코딩 없이 직접 경로 사용)
  // imagor의 local loader가 /result/uploaded/...에서 파일을 읽음
  return `${apiBaseUrl}/api/image-proxy/fit-in/640x640/filters:format(webp):quality(80)/uploaded/${yyyyMMdd}/${filename}`;
}

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(60).optional(),
  from: z.string().refine(isValidDateFilter, 'Use YYYY-MM-DD (Asia/Seoul) or an ISO datetime with timezone').optional(),
  to: z.string().refine(isValidDateFilter, 'Use YYYY-MM-DD (Asia/Seoul) or an ISO datetime with timezone').optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  page: z.coerce.number().min(1).optional()
});

const idParamsSchema = z.object({
  id: z.string()
});

export async function registerSharedMediaRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/shared/upload - Upload media files
  app.post(
    '/api/shared/upload',
    {
      schema: {
        tags: ['Shared Media'],
        summary: 'Upload shared media files',
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    filename: { type: 'string' },
                    originalName: { type: 'string' },
                    mime: { type: 'string' },
                    size: { type: 'number' },
                    mediaUrl: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    accountName: { type: 'string', nullable: true },
                    caption: { type: 'string', nullable: true },
                    uploadBatchId: { type: 'string', nullable: true },
                    uploadedAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            },
            required: ['success', 'data']
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' }
                },
                required: ['code', 'message']
              }
            },
            required: ['success', 'error']
          }
        }
      }
    },
    async (request, reply) => {
      const release = acquireUploadSlot();
      if (!release) {
        reply.header('Retry-After', '5');
        return sendError(reply, 'Too many simultaneous uploads', 429, 'TOO_MANY_REQUESTS');
      }
      let staged: StagedUpload | undefined;
      try {
        staged = await stageUpload(request, ['caption', 'accountName']);
        const uploadBatchId = randomUUID();
        const uploadDate = new Date();
        const uploadDir = getUploadPath(uploadDate);
        await mkdir(uploadDir, { recursive: true });
        const uploadedMedia = [];
        const apiBaseUrl = getApiBaseUrl(request);
        const yyyyMMdd = formatDateToYYYYMMDD(uploadDate);

        for (const file of staged.files) {
          const uniqueFilename = `${randomUUID()}${file.extension}`;
          const filepath = path.join(uploadDir, uniqueFilename);
          await copyFile(file.filepath, filepath, constants.COPYFILE_EXCL);
          let media;
          try {
            media = await createSharedMedia({
              filename: uniqueFilename,
              originalName: file.originalName,
              mime: file.mime,
              size: file.size,
              accountName: staged.fields.accountName,
              caption: uploadedMedia.length === 0 ? staged.fields.caption : undefined,
              uploadBatchId,
              uploadedAt: uploadDate
            });
          } catch (error) {
            await unlink(filepath);
            throw error;
          }
          const mediaUrl = buildUploadedMediaUrl(apiBaseUrl, yyyyMMdd, uniqueFilename);
          uploadedMedia.push({
            id: media.id,
            filename: media.filename,
            originalName: media.originalName,
            mime: media.mime,
            size: media.size,
            mediaUrl,
            thumbnailUrl: buildUploadedThumbnailUrl(apiBaseUrl, yyyyMMdd, uniqueFilename, mediaUrl),
            accountName: media.accountName,
            caption: media.caption,
            uploadBatchId: media.uploadBatchId,
            uploadedAt: media.uploadedAt.toISOString()
          });
        }
        await staged.cleanup();
        staged = undefined;
        release();
        return sendSuccess(reply, uploadedMedia);
      } catch (error) {
        await staged?.cleanup();
        staged = undefined;
        release();
        if (error instanceof UploadError) return sendError(reply, error.message, error.statusCode, error.code);
        app.log.error(error, 'Failed to upload files');
        return sendError(reply, 'Failed to upload files');
      } finally {
        try { await staged?.cleanup(); } finally { release(); }
      }
    }
  );

  // GET /api/shared - List shared media
  app.get(
    '/api/shared',
    {
      schema: {
        tags: ['Shared Media'],
        summary: 'List shared media',
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 60 },
            from: { type: 'string', description: 'YYYY-MM-DD in Asia/Seoul, or ISO datetime with timezone' },
            to: { type: 'string', description: 'Inclusive date in Asia/Seoul, or ISO datetime with timezone' },
            search: { type: 'string', maxLength: 200 },
            sort: { type: 'string', enum: ['newest', 'oldest'] },
            page: { type: 'integer', minimum: 1 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    filename: { type: 'string' },
                    originalName: { type: 'string' },
                    mime: { type: 'string' },
                    size: { type: 'number' },
                    width: { type: 'number', nullable: true },
                    height: { type: 'number', nullable: true },
                    duration: { type: 'number', nullable: true },
                    mediaUrl: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    accountName: { type: 'string', nullable: true },
                    caption: { type: 'string', nullable: true },
                    uploadBatchId: { type: 'string', nullable: true },
                    uploadedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              meta: {
                type: 'object',
                properties: {
                  hasMore: { type: 'boolean' },
                  nextCursor: { type: 'string', nullable: true },
                  total: { type: 'number' }
                },
                required: ['hasMore', 'nextCursor', 'total']
              }
            },
            required: ['success', 'data', 'meta']
          }
        }
      }
    },
    async (request, reply) => {
      const parsed = listQuerySchema.safeParse(request.query);
      if (!parsed.success) return sendError(reply, 'Invalid shared media filters', 400, 'BAD_REQUEST');
      const params = parsed.data;
      const result = await listSharedMedia(params);
      const apiBaseUrl = getApiBaseUrl(request);

      const data = result.data.map((media: any) => {
        const uploadDate = new Date(media.uploadedAt);
        const yyyyMMdd = formatDateToYYYYMMDD(uploadDate);
        const mediaUrl = buildUploadedMediaUrl(apiBaseUrl, yyyyMMdd, media.filename);
        const thumbnailUrl = buildUploadedThumbnailUrl(apiBaseUrl, yyyyMMdd, media.filename, mediaUrl);

        return {
          id: media.id,
          filename: media.filename,
          originalName: media.originalName,
          mime: media.mime,
          size: media.size,
          width: media.width,
          height: media.height,
          duration: media.duration,
          mediaUrl,
          thumbnailUrl,
          accountName: media.accountName,
          caption: media.caption,
          uploadBatchId: media.uploadBatchId,
          uploadedAt: media.uploadedAt.toISOString()
        };
      });

      return sendSuccess(reply, data, 200, {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        total: result.total
      });
    }
  );

  // GET /api/shared/:id - Get shared media by ID
  app.get(
    '/api/shared/:id',
    {
      schema: {
        tags: ['Shared Media'],
        summary: 'Get shared media by ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  filename: { type: 'string' },
                  originalName: { type: 'string' },
                  mime: { type: 'string' },
                  size: { type: 'number' },
                  width: { type: 'number', nullable: true },
                  height: { type: 'number', nullable: true },
                  duration: { type: 'number', nullable: true },
                  mediaUrl: { type: 'string' },
                  thumbnailUrl: { type: 'string' },
                  accountName: { type: 'string', nullable: true },
                  caption: { type: 'string', nullable: true },
                  uploadBatchId: { type: 'string', nullable: true },
                  uploadedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            required: ['success', 'data']
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' }
                },
                required: ['code', 'message']
              }
            },
            required: ['success', 'error']
          }
        }
      }
    },
    async (request, reply) => {
      const params = idParamsSchema.parse(request.params);
      const media = await getSharedMediaById(params.id);

      if (!media || media.isDeleted) {
        return sendError(reply, 'Shared media not found', 404, 'NOT_FOUND');
      }

      const apiBaseUrl = getApiBaseUrl(request);
      const uploadDate = new Date(media.uploadedAt);
      const yyyyMMdd = formatDateToYYYYMMDD(uploadDate);
      const mediaUrl = buildUploadedMediaUrl(apiBaseUrl, yyyyMMdd, media.filename);
      const thumbnailUrl = buildUploadedThumbnailUrl(apiBaseUrl, yyyyMMdd, media.filename, mediaUrl);

      return sendSuccess(reply, {
        id: media.id,
        filename: media.filename,
        originalName: media.originalName,
        mime: media.mime,
        size: media.size,
        width: media.width,
        height: media.height,
        duration: media.duration,
        mediaUrl,
        thumbnailUrl,
        accountName: media.accountName,
        caption: media.caption,
        uploadBatchId: media.uploadBatchId,
        uploadedAt: media.uploadedAt.toISOString()
      });
    }
  );
}
