import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { lookup } from 'mime-types';
import { z } from 'zod';
import { sendFileWithRange } from '../utils/range.js';
import { prisma } from '../db/client.js';
import { getSourceRootPath } from '../utils/fileUpload.js';

const paramsSchema = z.object({
  account: z.string().min(1),
  filename: z.string().min(1)
});

const filenameOnlySchema = z.object({
  filename: z.string().min(1).refine((value) => !value.includes('/') && !value.includes('..'), {
    message: 'Invalid filename'
  })
});

/**
 * Sanitize and validate file path to prevent directory traversal attacks
 * @throws Error if path contains traversal sequences or is absolute
 */
function sanitizePath(filePath: string): string {
  // Normalize the path to resolve any . or .. sequences
  const normalized = path.normalize(filePath);

  // Check for path traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // Reject absolute paths
  if (path.isAbsolute(normalized)) {
    throw new Error('Absolute paths not allowed');
  }

  // Reject paths that try to escape using backslashes (Windows-style)
  if (filePath.includes('\\')) {
    throw new Error('Invalid path separator');
  }

  return normalized;
}

/**
 * Validate that the resolved path is within the allowed base directory
 */
function validatePathWithinBase(basePath: string, requestedPath: string): string {
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(basePath, requestedPath);

  if (!resolvedFull.startsWith(resolvedBase + path.sep) && resolvedFull !== resolvedBase) {
    throw new Error('Path escapes base directory');
  }

  return resolvedFull;
}

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
  const dataRoot = process.env.CRAWL_OUTPUT_DIR ?? getSourceRootPath();

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

      // Sanitize and validate path
      let filePath: string;
      try {
        const sanitizedAccount = sanitizePath(account);
        const sanitizedFilename = sanitizePath(filename);
        filePath = validatePathWithinBase(dataRoot, path.join(sanitizedAccount, sanitizedFilename));
      } catch (error) {
        app.log.warn(error, 'Invalid path requested');
        return reply.code(400).send({ message: 'Invalid path' });
      }

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

      // Sanitize and validate path
      let filePath: string;
      try {
        const sanitizedAccount = sanitizePath(resolution.accountId);
        const sanitizedFilename = sanitizePath(filename);
        filePath = validatePathWithinBase(dataRoot, path.join(sanitizedAccount, sanitizedFilename));
      } catch (error) {
        app.log.warn(error, 'Invalid path requested');
        return reply.code(400).send({ message: 'Invalid path' });
      }

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

      // 업로드된 파일은 DATA_ROOT/uploaded/에 저장됨 (fileUpload.ts와 일치해야 함)
      const uploadDataRoot = process.env.DATA_ROOT ?? '/data';

      // Validate date format (yyyyMMdd)
      if (!/^\d{8}$/.test(date)) {
        return reply.code(400).send({ message: 'Invalid date format' });
      }

      // Sanitize and validate path
      let filePath: string;
      try {
        const sanitizedFilename = sanitizePath(filename);
        const uploadedBase = path.join(uploadDataRoot, 'uploaded');
        filePath = validatePathWithinBase(uploadedBase, path.join(date, sanitizedFilename));
      } catch (error) {
        app.log.warn(error, 'Invalid path requested');
        return reply.code(400).send({ message: 'Invalid path' });
      }

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
