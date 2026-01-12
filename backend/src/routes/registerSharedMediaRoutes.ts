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
  const publicApiUrl = process.env.PUBLIC_API_BASE_URL || '';

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
                    caption: { type: 'string', nullable: true },
                    uploadBatchId: { type: 'string', nullable: true },
                    uploadedAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          400: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      app.log.info('=== Upload request received ===');
      const parts = request.parts();
      const files: Array<{ file: MultipartFile; buffer: Buffer }> = [];
      let caption: string | undefined;
      const uploadBatchId = randomUUID();

      try {
        app.log.info('Processing multipart form data...');
        for await (const part of parts) {
          if (part.type === 'file') {
            app.log.info(`File part received: ${part.filename}, mimetype: ${part.mimetype}`);
            // Read buffer immediately to consume the stream
            const buffer = await part.toBuffer();
            app.log.info(`File buffer read: ${buffer.length} bytes`);
            files.push({ file: part as MultipartFile, buffer });
          } else if (part.type === 'field' && part.fieldname === 'caption') {
            caption = (part as any).value as string;
            app.log.info(`Caption field received: ${caption}`);
          }
        }

        app.log.info(`Total files received: ${files.length}`);
        if (files.length === 0) {
          app.log.warn('No files provided in request');
          return reply.code(400).send({ message: 'No files provided' });
        }

        const uploadedMedia = [];

        for (const { file, buffer } of files) {
          app.log.info(`Processing file: ${file.filename}`);

          // Validate file
          app.log.info(`File buffer size: ${buffer.length} bytes`);

          const validation = validateFileType(file.mimetype, buffer.length);
          app.log.info(`File validation result: ${JSON.stringify(validation)}`);

          if (!validation.valid) {
            app.log.error(`File validation failed: ${validation.error}`);
            return reply.code(400).send({ message: validation.error });
          }

          // Generate unique filename
          const uniqueFilename = generateUniqueFilename(file.filename);
          app.log.info(`Generated unique filename: ${uniqueFilename}`);

          // Save file
          app.log.info('Saving file to disk...');
          const { size } = await saveUploadedFile(
            {
              ...file,
              toBuffer: async () => buffer
            } as MultipartFile,
            uniqueFilename
          );
          app.log.info(`File saved successfully, size: ${size} bytes`);

          // Create database record
          app.log.info('Creating database record...');
          const media = await createSharedMedia({
            filename: uniqueFilename,
            originalName: file.filename,
            mime: file.mimetype,
            size,
            caption: uploadedMedia.length === 0 ? caption : undefined,
            uploadBatchId
          });
          app.log.info(`Database record created with ID: ${media.id}`);

          // Construct media URL
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const yyyyMMdd = `${year}${month}${day}`;
          const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${uniqueFilename}`;
          app.log.info(`Media URL: ${mediaUrl}`);

          uploadedMedia.push({
            id: media.id,
            filename: media.filename,
            originalName: media.originalName,
            mime: media.mime,
            size: media.size,
            mediaUrl,
            caption: media.caption,
            uploadBatchId: media.uploadBatchId,
            uploadedAt: media.uploadedAt.toISOString()
          });
        }

        app.log.info(`Upload completed successfully. Total files uploaded: ${uploadedMedia.length}`);
        return { data: uploadedMedia };
      } catch (error) {
        app.log.error(error, 'Failed to upload files');
        app.log.error(`Error details: ${JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })}`);
        return reply.code(500).send({ message: 'Failed to upload files' });
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
                    caption: { type: 'string', nullable: true },
                    uploadBatchId: { type: 'string', nullable: true },
                    uploadedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              hasMore: { type: 'boolean' },
              nextCursor: { type: 'string', nullable: true }
            }
          }
        }
      }
    },
    async (request) => {
      const params = listQuerySchema.parse(request.query);
      const result = await listSharedMedia(params);

      const data = result.data.map((media: any) => {
        const uploadDate = new Date(media.uploadedAt);
        const year = uploadDate.getFullYear();
        const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
        const day = String(uploadDate.getDate()).padStart(2, '0');
        const yyyyMMdd = `${year}${month}${day}`;
        const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${media.filename}`;

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
          caption: media.caption,
          uploadBatchId: media.uploadBatchId,
          uploadedAt: media.uploadedAt.toISOString()
        };
      });

      return {
        data,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      };
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
                  caption: { type: 'string', nullable: true },
                  uploadBatchId: { type: 'string', nullable: true },
                  uploadedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const params = idParamsSchema.parse(request.params);
      const media = await getSharedMediaById(params.id);

		if (!media || media.isDeleted) {
			return reply.code(404).send({ message: 'Shared media not found' });
		}


      const uploadDate = new Date(media.uploadedAt);
      const year = uploadDate.getFullYear();
      const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
      const day = String(uploadDate.getDate()).padStart(2, '0');
      const yyyyMMdd = `${year}${month}${day}`;
      const mediaUrl = `${publicApiUrl}/api/media/uploaded/${yyyyMMdd}/${media.filename}`;

      return {
        data: {
          id: media.id,
          filename: media.filename,
          originalName: media.originalName,
          mime: media.mime,
          size: media.size,
          width: media.width,
          height: media.height,
          duration: media.duration,
          mediaUrl,
          caption: media.caption,
          uploadBatchId: media.uploadBatchId,
          uploadedAt: media.uploadedAt.toISOString()
        }
      };
    }
  );
}
