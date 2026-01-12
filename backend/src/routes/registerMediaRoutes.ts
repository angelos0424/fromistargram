import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { lookup } from 'mime-types';
import { z } from 'zod';
import { sendFileWithRange } from '../utils/range.js';
import { prisma } from '../db/client.js';

const paramsSchema = z.object({
  account: z.string().min(1),
  filename: z.string().min(1)
});

const filenameOnlySchema = z.object({
  filename: z.string().min(1).refine((value) => !value.includes('/') && !value.includes('..'), {
    message: 'Invalid filename'
  })
});

async function resolveAccountForFilename(filename: string): Promise<{ accountId: string } | { ambiguous: true } | null> {
  const [mediaMatches, profilePicMatches] = await Promise.all([
    (prisma.media as any).findMany({
      where: { filename },
      select: { post: { select: { accountId: true } } },
      take: 2
    }) as Promise<{ post: { accountId: string } }[]>,
    (prisma.profilePic as any).findMany({
      where: { filename },
      select: { accountId: true },
      take: 2
    }) as Promise<{ accountId: string }[]>
  ]);

  const accountIds = [
    ...mediaMatches.map((match) => match.post.accountId),
    ...profilePicMatches.map((match) => match.accountId)
  ];

  if (accountIds.length === 0) {
    return null;
  }

  const uniqueAccounts = new Set(accountIds);
  if (uniqueAccounts.size > 1 || accountIds.length > 1) {
    return { ambiguous: true } as const;
  }

  return { accountId: accountIds[0] };
}

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  const dataRoot = process.env.DATA_ROOT ?? '/root';

  app.get(
    '/api/media/:account/*',
    {
      schema: {
        tags: ['Media'],
        summary: 'Stream media file with HTTP range support',
        params: {
          type: 'object',
          properties: {
            account: { type: 'string' },
            '*': { type: 'string' }
          },
          required: ['account', '*'],
          additionalProperties: false
        },
        response: {
          200: {
            type: 'string',
            format: 'binary'
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const { account } = paramsSchema.pick({ account: true }).parse(request.params);
      const filename = (request.params as any)['*'];
      const filePath = path.join(dataRoot, account, filename);

      try {
        await access(filePath, constants.R_OK);
      } catch (error) {
        app.log.warn(error, 'Media not found: %s', filePath);
        return reply.code(404).send({ message: 'Media not found' });
      }

      const mimeType = lookup(filename) || 'application/octet-stream';
      return sendFileWithRange(reply, {
        filePath,
        rangeHeader: request.headers.range,
        mimeType
      });
    }
  );

  app.get(
    '/api/media/by-filename/*',
    {
      schema: {
        tags: ['Media'],
        summary: 'Stream media or profile picture by filename only',
        params: {
          type: 'object',
          properties: {
            '*': { type: 'string' }
          },
          required: ['*'],
          additionalProperties: false
        },
        response: {
          200: {
            type: 'string',
            format: 'binary'
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message'],
            additionalProperties: false
          },
          409: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const filename = (request.params as any)['*'];

      const resolution = await resolveAccountForFilename(filename);
      if (!resolution) {
        return reply.code(404).send({ message: 'Media not found' });
      }

      if ('ambiguous' in resolution) {
        return reply
          .code(409)
          .send({ message: 'Multiple media records share this filename' });
      }

      const filePath = path.join(dataRoot, resolution.accountId, filename);

      try {
        await access(filePath, constants.R_OK);
      } catch (error) {
        app.log.warn(error, 'Media not found: %s', filePath);
        return reply.code(404).send({ message: 'Media not found' });
      }

      const mimeType = lookup(filename) || 'application/octet-stream';
      return sendFileWithRange(reply, {
        filePath,
        rangeHeader: request.headers.range,
        mimeType
      });
    }
  );

  // GET /api/media/uploaded/:yyyyMMdd/* - Serve uploaded shared media
  app.get(
    '/api/media/uploaded/:date/*',
    {
      schema: {
        tags: ['Media'],
        summary: 'Stream uploaded shared media file',
        params: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{8}$' },
            '*': { type: 'string' }
          },
          required: ['date', '*'],
          additionalProperties: false
        },
        response: {
          200: {
            type: 'string',
            format: 'binary'
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const date = (request.params as any).date;
      const filename = (request.params as any)['*'];

      const resultRoot = process.env.RESULT_ROOT ?? '/result';
      const filePath = path.join(resultRoot, 'uploaded', date, filename);


      console.log('get uploaded filepath : ', filePath)

      try {
        await access(filePath, constants.R_OK);
      } catch (error) {
        app.log.warn(error, 'Uploaded media not found: %s', filePath);
        return reply.code(404).send({ message: 'Media not found' });
      }

      const mimeType = lookup(filename) || 'application/octet-stream';
      return sendFileWithRange(reply, {
        filePath,
        rangeHeader: request.headers.range,
        mimeType
      });
    }
  );
}
