import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import {
  listSharedMedia,
  updateSharedMediaCaption,
  softDeleteSharedMedia,
  getSharedMediaById
} from '../services/sharedMediaService.js';
function buildUploadedMediaUrl(publicApiUrl: string, yyyyMMdd: string, filename: string): string {
  return `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${filename}`;
}

function buildUploadedThumbnailUrl(publicApiUrl: string, yyyyMMdd: string, filename: string, fallbackUrl: string): string {
  const prefix = publicApiUrl ? `${publicApiUrl}/api/image-proxy` : '/api/image-proxy';
  const path = `fit-in/640x640/filters:format(webp):quality(80)/uploaded/${yyyyMMdd}/${filename}`;
  return `${prefix}/${path}`;
}

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(60).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  includeDeleted: z.coerce.boolean().optional()
});

const listQueryJsonSchema = {
  type: 'object',
  properties: {
    cursor: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 60 },
    from: { type: 'string' },
    to: { type: 'string' },
    includeDeleted: { type: 'boolean' }
  }
} as const;

const paramsSchema = z.object({
  id: z.string().min(1)
});

const paramsJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 }
  },
  required: ['id'],
  additionalProperties: false
} as const;

const updateBodySchema = z.object({
  caption: z.string().max(2000).nullable()
});

const updateBodyJsonSchema = {
  type: 'object',
  properties: {
    caption: { type: ['string', 'null'], maxLength: 2000 }
  },
  required: ['caption'],
  additionalProperties: false
} as const;

const sharedMediaSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    filename: { type: 'string' },
    originalName: { type: 'string' },
    mime: { type: 'string' },
    size: { type: 'number' },
    width: { type: ['number', 'null'] },
    height: { type: ['number', 'null'] },
    duration: { type: ['number', 'null'] },
    mediaUrl: { type: 'string' },
    thumbnailUrl: { type: 'string' },
    caption: { type: ['string', 'null'] },
    uploadBatchId: { type: ['string', 'null'] },
    isDeleted: { type: 'boolean' },
    uploadedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'filename', 'originalName', 'mime', 'size', 'mediaUrl', 'thumbnailUrl', 'isDeleted', 'uploadedAt'],
  additionalProperties: false
} as const;

const listResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: sharedMediaSchema
    },
    hasMore: { type: 'boolean' },
    nextCursor: { type: ['string', 'null'] }
  },
  required: ['data', 'hasMore', 'nextCursor'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    data: sharedMediaSchema
  },
  required: ['data'],
  additionalProperties: false
} as const;

export async function registerAdminSharedMediaRoutes(app: FastifyInstance): Promise<void> {
  const publicApiUrl = process.env.PUBLIC_API_BASE_URL || '';

  app.get(
    '/api/admin/shared',
    {
      schema: {
        tags: ['AdminSharedMedia'],
        querystring: listQueryJsonSchema,
        response: {
          200: listResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = listQuerySchema.parse(request.query);
        const result = await listSharedMedia(params);
        const data = result.data.map((media) => {
          const uploadDate = new Date(media.uploadedAt);
          const year = uploadDate.getFullYear();
          const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
          const day = String(uploadDate.getDate()).padStart(2, '0');
        const yyyyMMdd = `${year}${month}${day}`;
        const mediaUrl = buildUploadedMediaUrl(publicApiUrl, yyyyMMdd, media.filename);
        const thumbnailUrl = buildUploadedThumbnailUrl(publicApiUrl, yyyyMMdd, media.filename, mediaUrl);

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
          caption: media.caption,
          uploadBatchId: media.uploadBatchId,
          isDeleted: media.isDeleted,
          uploadedAt: media.uploadedAt.toISOString()
        };
        });

        return {
          data,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor
        };
      } catch (error) {
        request.log.error(error, 'Failed to fetch shared media');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request parameters' });
        }
        return reply.code(500).send({ message: 'Failed to fetch shared media' });
      }
    }
  );

  app.patch(
    '/api/admin/shared/:id',
    {
      schema: {
        tags: ['AdminSharedMedia'],
        params: paramsJsonSchema,
        body: updateBodyJsonSchema,
        response: {
          200: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = updateBodySchema.parse(request.body);
        const existing = await getSharedMediaById(params.id);
        if (!existing) {
          return reply.code(404).send({ message: 'Shared media not found' });
        }
        const updated = await updateSharedMediaCaption(params.id, body.caption);
        const uploadDate = new Date(updated.uploadedAt);
        const year = uploadDate.getFullYear();
        const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
        const day = String(uploadDate.getDate()).padStart(2, '0');
        const yyyyMMdd = `${year}${month}${day}`;
        const mediaUrl = buildUploadedMediaUrl(publicApiUrl, yyyyMMdd, updated.filename);
        const thumbnailUrl = buildUploadedThumbnailUrl(publicApiUrl, yyyyMMdd, updated.filename, mediaUrl);

        return {
          data: {
            id: updated.id,
            filename: updated.filename,
            originalName: updated.originalName,
            mime: updated.mime,
            size: updated.size,
            width: updated.width,
            height: updated.height,
            duration: updated.duration,
            mediaUrl,
            thumbnailUrl,
            caption: updated.caption,
            uploadBatchId: updated.uploadBatchId,
            isDeleted: updated.isDeleted,
            uploadedAt: updated.uploadedAt.toISOString()
          }
        };
      } catch (error) {
        request.log.error(error, 'Failed to update shared media');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request body' });
        }
        return reply.code(500).send({ message: 'Failed to update shared media' });
      }
    }
  );

  app.delete(
    '/api/admin/shared/:id',
    {
      schema: {
        tags: ['AdminSharedMedia'],
        params: paramsJsonSchema,
        response: {
          204: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const deleted = await softDeleteSharedMedia(params.id);
        if (!deleted) {
          return reply.code(404).send({ message: 'Shared media not found' });
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete shared media');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request parameters' });
        }
        return reply.code(500).send({ message: 'Failed to delete shared media' });
      }
    }
  );
}
