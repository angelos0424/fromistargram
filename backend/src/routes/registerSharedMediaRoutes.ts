import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'node:crypto';
import {
  createSharedMedia,
  listSharedMedia,
  getSharedMediaById
} from '../services/sharedMediaService.js';
import {
  validateFileType,
  saveUploadedFile,
  generateUniqueFilename
} from '../utils/fileUpload.js';
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
  from: z.string().optional(),
  to: z.string().optional()
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
      app.log.info('=== Upload request received ===');
      const parts = request.parts();
      const files: Array<{ file: MultipartFile; buffer: Buffer }> = [];
      let caption: string | undefined;
      let accountName: string | undefined;
      const uploadBatchId = randomUUID();

      try {
        app.log.info('Processing multipart form data...');
        for await (const part of parts) {
          if (part.type === 'file') {
            app.log.info(`File part received: ${part.filename}, mimetype: ${part.mimetype}`);
            const buffer = await part.toBuffer();
            app.log.info(`File buffer read: ${buffer.length} bytes`);
            files.push({ file: part as MultipartFile, buffer });
          } else if (part.type === 'field' && part.fieldname === 'caption') {
            caption = (part as any).value as string;
            app.log.info(`Caption field received: ${caption}`);
          } else if (part.type === 'field' && part.fieldname === 'accountName') {
            accountName = (part as any).value as string;
            app.log.info(`Account name field received: ${accountName}`);
          }
        }

        app.log.info(`Total files received: ${files.length}`);
        if (files.length === 0) {
          app.log.warn('No files provided in request');
          return sendError(reply, 'No files provided', 400, 'BAD_REQUEST');
        }

        const uploadedMedia = [];

        for (const { file, buffer } of files) {
          app.log.info(`Processing file: ${file.filename}`);
          app.log.info(`File buffer size: ${buffer.length} bytes`);

          const validation = validateFileType(file.mimetype, buffer.length);
          app.log.info(`File validation result: ${JSON.stringify(validation)}`);

          if (!validation.valid) {
            app.log.error(`File validation failed: ${validation.error}`);
            return sendError(reply, validation.error || 'Invalid file', 400, 'BAD_REQUEST');
          }

          const uniqueFilename = generateUniqueFilename(file.filename);
          app.log.info(`Generated unique filename: ${uniqueFilename}`);

          app.log.info('Saving file to disk...');
          const { size } = await saveUploadedFile(
            {
              ...file,
              toBuffer: async () => buffer
            } as MultipartFile,
            uniqueFilename
          );
          app.log.info(`File saved successfully, size: ${size} bytes`);

          app.log.info('Creating database record...');
          const media = await createSharedMedia({
            filename: uniqueFilename,
            originalName: file.filename,
            mime: file.mimetype,
            size,
            accountName,
            caption: uploadedMedia.length === 0 ? caption : undefined,
            uploadBatchId
          });
          app.log.info(`Database record created with ID: ${media.id}`);

          const date = new Date();
          const apiBaseUrl = getApiBaseUrl(request);
          const yyyyMMdd = formatDateToYYYYMMDD(date);
          const mediaUrl = buildUploadedMediaUrl(apiBaseUrl, yyyyMMdd, uniqueFilename);
          const thumbnailUrl = buildUploadedThumbnailUrl(apiBaseUrl, yyyyMMdd, uniqueFilename, mediaUrl);
          app.log.info(`Media URL: ${mediaUrl}`);

          uploadedMedia.push({
            id: media.id,
            filename: media.filename,
            originalName: media.originalName,
            mime: media.mime,
            size: media.size,
            mediaUrl,
            thumbnailUrl,
            accountName: media.accountName,
            caption: media.caption,
            uploadBatchId: media.uploadBatchId,
            uploadedAt: media.uploadedAt.toISOString()
          });
        }

        app.log.info(`Upload completed successfully. Total files uploaded: ${uploadedMedia.length}`);
        return sendSuccess(reply, uploadedMedia);
      } catch (error) {
        app.log.error(error, 'Failed to upload files');
        app.log.error(`Error details: ${JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })}`);
        return sendError(reply, 'Failed to upload files');
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
            from: { type: 'string' },
            to: { type: 'string' }
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
                  nextCursor: { type: 'string', nullable: true }
                },
                required: ['hasMore', 'nextCursor']
              }
            },
            required: ['success', 'data', 'meta']
          }
        }
      }
    },
    async (request, reply) => {
      const params = listQuerySchema.parse(request.query);
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
        nextCursor: result.nextCursor
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
