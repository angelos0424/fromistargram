import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSourcePath, validateFileType } from '../utils/fileUpload.js';
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

function resolveFileExtension(file: MultipartFile): string {
  const extFromName = path.extname(file.filename ?? '');
  return extFromName || '';
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
      const parts = request.parts();
      const files: Array<{ file: MultipartFile; buffer: Buffer }> = [];
      let accountId: string | undefined;
      let postedAt: string | undefined;
      let type: ManualUploadType | null = null;
      let caption: string | undefined;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname !== 'files') {
            return sendError(reply, 'Unexpected file field name', 400, 'BAD_REQUEST');
          }
          const buffer = await part.toBuffer();
          files.push({ file: part as MultipartFile, buffer });
          continue;
        }

        if (part.type === 'field') {
          const value = (part as { value?: string }).value ?? '';
          switch (part.fieldname) {
            case 'accountId':
              accountId = value;
              break;
            case 'postedAt':
              postedAt = value;
              break;
            case 'type':
              type = resolveType(value);
              break;
            case 'caption':
              caption = value;
              break;
            default:
              break;
          }
        }
      }

      if (!accountId) {
        return sendError(reply, 'accountId is required', 400, 'BAD_REQUEST');
      }

      if (!postedAt) {
        return sendError(reply, 'postedAt is required', 400, 'BAD_REQUEST');
      }

      const parsedPostedAt = parsePostedAt(postedAt);
      if (!parsedPostedAt) {
        return sendError(reply, 'postedAt must be a valid ISO 8601 datetime', 400, 'BAD_REQUEST');
      }

      if (!type) {
        return sendError(reply, 'type must be Post or Story', 400, 'BAD_REQUEST');
      }

      if (files.length === 0) {
        return sendError(reply, 'files are required', 400, 'BAD_REQUEST');
      }

      const sourceDir = getSourcePath(accountId, parsedPostedAt.date);
      await mkdir(sourceDir, { recursive: true });

      const savedFiles: Array<{ filename: string; filepath: string }> = [];
      const totalFiles = files.length;

      for (const [index, entry] of files.entries()) {
        const validation = validateFileType(entry.file.mimetype, entry.buffer.length);
        if (!validation.valid) {
          return sendError(reply, validation.error || 'Invalid file', 400, 'BAD_REQUEST');
        }

        const ext = resolveFileExtension(entry.file);
        const fileSuffix =
          totalFiles === 1
            ? `_UTC${ext}`
            : `_UTC_${index + 1}${ext}`;
        const filename = `${parsedPostedAt.timestampBase}${fileSuffix}`;
        const filepath = path.join(sourceDir, filename);
        await writeFile(filepath, entry.buffer);
        savedFiles.push({ filename, filepath });
      }

      let captionFile: string | null = null;
      if (caption !== undefined) {
        const filename = `${parsedPostedAt.timestampBase}_UTC.txt`;
        const filepath = path.join(sourceDir, filename);
        await writeFile(filepath, caption);
        captionFile = filepath;
      }

      const metadataFilename = `${parsedPostedAt.timestampBase}_UTC.json`;
      const metadataPath = path.join(sourceDir, metadataFilename);
      await writeFile(
        metadataPath,
        JSON.stringify(
          {
            instaloader: {
              node_type: type === 'Story' ? 'StoryItem' : 'Post'
            }
          },
          null,
          2
        )
      );

      return sendSuccess(reply, {
        accountId,
        postedAt,
        type,
        savedFiles,
        captionFile,
        metadataFile: metadataPath
      });
    }
  );
}
