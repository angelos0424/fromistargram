import { FastifyInstance } from 'fastify';
import { constants } from 'node:fs';
import { copyFile, mkdir, open, readdir, realpath, unlink } from 'node:fs/promises';
import path from 'path';
import { resolveSourceRoot } from '../utils/sourceRoot.js';
import { prisma } from '../db/client.js';
import { acquireUploadSlot, stageUpload, StagedUpload, UploadError } from '../utils/stagedUpload.js';
import { sendError, sendSuccess } from '../utils/response.js';

type ManualUploadType = 'Post' | 'Story';

function parsePostedAt(value: string): { date: Date; timestampBase: string } | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const yyyy = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const HH = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  const timestampBase = `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`;
  return { date, timestampBase };
}

function resolveType(value?: string): ManualUploadType | null {
  if (value === 'Post' || value === 'Story') {
    return value;
  }
  return null;
}

export async function registerAdminManualUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/admin/manual-upload',
    {
      schema: {
        tags: ['AdminManualUpload'],
        summary: 'Manual upload to source directory',
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'object',
                properties: {
                  accountId: { type: 'string' },
                  postedAt: { type: 'string' },
                  type: { type: 'string', enum: ['Post', 'Story'] },
                  savedFiles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        filename: { type: 'string' },
                        filepath: { type: 'string' }
                      },
                      required: ['filename', 'filepath']
                    }
                  },
                  captionFile: { type: ['string', 'null'] },
                  metadataFile: { type: ['string', 'null'] }
                },
                required: ['accountId', 'postedAt', 'type', 'savedFiles']
              }
            },
            required: ['success', 'data']
          }
        }
      }
    },
    async (request, reply) => {
      const release = acquireUploadSlot('admin');
      if (!release) {
        reply.header('Retry-After', '5');
        return sendError(reply, 'Too many simultaneous uploads', 429, 'TOO_MANY_REQUESTS');
      }
      let staged: StagedUpload | undefined;
      let lockPath: string | undefined;
      const createdPaths: string[] = [];
      let completed = false;
      const cleanup = async () => {
        const work: Promise<unknown>[] = [];
        if (!completed) work.push(...createdPaths.splice(0).map((filepath) => unlink(filepath)));
        if (lockPath) {
          work.push(unlink(lockPath));
          lockPath = undefined;
        }
        if (staged) {
          work.push(staged.cleanup());
          staged = undefined;
        }
        const results = await Promise.allSettled(work);
        for (const result of results) {
          if (result.status === 'rejected') request.log.error(result.reason, 'Upload cleanup failed');
        }
        release();
      };
      try {
        staged = await stageUpload(request, ['accountId', 'postedAt', 'type', 'caption']);
        const { accountId, postedAt, caption } = staged.fields;
        const type = resolveType(staged.fields.type);
        if (!accountId || !/^[A-Za-z0-9._-]{1,128}$/.test(accountId) || accountId === '.' || accountId.includes('..')) {
          throw new UploadError('accountId must be a valid account identifier');
        }
        const parsedPostedAt = postedAt && parsePostedAt(postedAt);
        if (!parsedPostedAt) throw new UploadError('postedAt must be a valid ISO 8601 datetime');
        if (!type) throw new UploadError('type must be Post or Story');
        const account = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } });
        if (!account) throw new UploadError('Account not found', 404, 'NOT_FOUND');

        const sourceRoot = resolveSourceRoot();
        await mkdir(sourceRoot, { recursive: true });
        const rootRealPath = await realpath(sourceRoot);
        const sourceDir = path.join(rootRealPath, accountId);
        await mkdir(sourceDir, { recursive: true });
        const sourceRealPath = await realpath(sourceDir);
        if (!sourceRealPath.startsWith(rootRealPath + path.sep)) {
          throw new UploadError('Account directory is outside the source root');
        }
        const base = `${parsedPostedAt.timestampBase}_UTC`;
        const candidateLock = path.join(sourceRealPath, `.${base}.upload.lock`);
        const lock = await open(candidateLock, 'wx', 0o600);
        lockPath = candidateLock;
        await lock.close();
        const existing = await readdir(sourceRealPath);
        if (existing.some((name) => name === base || name.startsWith(`${base}.`) || name.startsWith(`${base}_`))) {
          throw new UploadError('Media already exists for this account and timestamp', 409, 'CONFLICT');
        }

        const savedFiles: Array<{ filename: string; filepath: string }> = [];
        for (const [index, file] of staged.files.entries()) {
          const suffix = staged.files.length === 1 ? '' : `_${index + 1}`;
          const filename = `${base}${suffix}${file.extension}`;
          const filepath = path.join(sourceRealPath, filename);
          await copyFile(file.filepath, filepath, constants.COPYFILE_EXCL);
          createdPaths.push(filepath);
          savedFiles.push({ filename, filepath });
        }
        const writeExclusive = async (filepath: string, contents: string) => {
          const handle = await open(filepath, 'wx', 0o600);
          createdPaths.push(filepath);
          try { await handle.writeFile(contents); } finally { await handle.close(); }
        };
        let captionFile: string | null = null;
        if (caption !== undefined) {
          captionFile = path.join(sourceRealPath, `${base}.txt`);
          await writeExclusive(captionFile, caption);
        }
        const metadataPath = path.join(sourceRealPath, `${base}.json`);
        await writeExclusive(metadataPath, JSON.stringify({
          instaloader: { node_type: type === 'Story' ? 'StoryItem' : 'Post' }
        }, null, 2));
        completed = true;
        await cleanup();
        return sendSuccess(reply, { accountId, postedAt, type, savedFiles, captionFile, metadataFile: metadataPath });
      } catch (error) {
        await cleanup();
        if (error instanceof UploadError) return sendError(reply, error.message, error.statusCode, error.code);
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          return sendError(reply, 'Media already exists or an upload is in progress for this timestamp', 409, 'CONFLICT');
        }
        request.log.error(error, 'Manual upload failed');
        return sendError(reply, 'Failed to upload files');
      } finally {
        await cleanup();
      }
    }
  );
}
