import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db/client.js';
import {
  createSharedMedia
} from '../services/sharedMediaService.js';
import { scheduleIndexerRun, triggerIndexerRun } from '../services/indexerService.js';
import {
  generateUniqueFilename,
  getSourcePath,
  saveUploadedFile,
  validateFileType
} from '../utils/fileUpload.js';
import { formatDateToYYYYMMDD } from '../utils/dateFormat.js';
import { sendError, sendSuccess } from '../utils/response.js';

type MobileIngestContentType = 'POST' | 'STORY' | 'REEL';
type SourceUploadType = 'Post' | 'Story';
type StorageTarget = 'SOURCE' | 'SHARED';

type BufferedUploadFile = {
  file: MultipartFile;
  buffer: Buffer;
};

class IngestClientError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'IngestClientError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

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

function getWebBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, '');
}

function buildUploadedMediaUrl(apiBaseUrl: string, yyyyMMdd: string, filename: string): string {
  return `${apiBaseUrl}/api/media/uploaded/${yyyyMMdd}/${filename}`;
}

function buildUploadedThumbnailUrl(apiBaseUrl: string, yyyyMMdd: string, filename: string): string {
  return `${apiBaseUrl}/api/image-proxy/fit-in/640x640/filters:format(webp):quality(80)/uploaded/${yyyyMMdd}/${filename}`;
}

function normalizeAccountName(value?: string): string | null {
  const normalized = (value ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || null;
}

function parseContentType(value?: string): MobileIngestContentType {
  if (value === 'STORY' || value === 'REEL' || value === 'POST') {
    return value;
  }

  return 'POST';
}

function toSourceUploadType(contentType: MobileIngestContentType): SourceUploadType {
  return contentType === 'STORY' ? 'Story' : 'Post';
}

function parsePostedAt(value?: string): { date: Date; timestampBase: string } | null {
  if (!value) {
    return null;
  }

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

  return {
    date,
    timestampBase: `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`
  };
}

function resolveFileExtension(file: MultipartFile): string {
  return path.extname(file.filename ?? '');
}

function getMobileIngestToken(request: FastifyRequest): string | null {
  const headerToken = request.headers['x-mobile-ingest-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const authorization = request.headers.authorization;
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }

  return null;
}

function requireMobileIngestAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  const expectedToken = process.env.MOBILE_INGEST_TOKEN;
  if (!expectedToken) {
    sendError(
      reply,
      'Mobile ingest token is not configured',
      503,
      'MOBILE_INGEST_TOKEN_NOT_CONFIGURED'
    );
    return false;
  }

  if (getMobileIngestToken(request) === expectedToken) {
    return true;
  }

  sendError(reply, 'Mobile ingest token is required', 401, 'UNAUTHORIZED');
  return false;
}

async function readMobileIngestForm(request: FastifyRequest): Promise<{
  files: BufferedUploadFile[];
  accountName: string | null;
  uploadedAt?: string;
  contentType: MobileIngestContentType;
  caption?: string;
}> {
  const files: BufferedUploadFile[] = [];
  let accountName: string | null = null;
  let uploadedAt: string | undefined;
  let contentType: MobileIngestContentType = 'POST';
  let caption: string | undefined;

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname !== 'files') {
        throw new IngestClientError('Unexpected file field name');
      }

      files.push({
        file: part as MultipartFile,
        buffer: await part.toBuffer()
      });
      continue;
    }

    const value = (part as { value?: string }).value ?? '';
    switch (part.fieldname) {
      case 'accountName':
        accountName = normalizeAccountName(value);
        break;
      case 'uploadedAt':
        uploadedAt = value;
        break;
      case 'contentType':
        contentType = parseContentType(value);
        break;
      case 'caption':
        caption = value;
        break;
      default:
        break;
    }
  }

  return { files, accountName, uploadedAt, contentType, caption };
}

async function saveToShared(input: {
  files: BufferedUploadFile[];
  accountName: string | null;
  caption?: string;
  request: FastifyRequest;
}) {
  const uploadBatchId = randomUUID();
  const uploadedMedia = [];

  for (const { file, buffer } of input.files) {
    const validation = validateFileType(file.mimetype, buffer.length);
    if (!validation.valid) {
      throw new IngestClientError(validation.error || 'Invalid file');
    }

    const uniqueFilename = generateUniqueFilename(file.filename);
    const { size } = await saveUploadedFile(
      {
        ...file,
        toBuffer: async () => buffer
      } as MultipartFile,
      uniqueFilename
    );

    const media = await createSharedMedia({
      filename: uniqueFilename,
      originalName: file.filename,
      mime: file.mimetype,
      size,
      accountName: input.accountName ?? undefined,
      caption: uploadedMedia.length === 0 ? input.caption : undefined,
      uploadBatchId
    });

    const uploadDate = new Date(media.uploadedAt);
    const apiBaseUrl = getApiBaseUrl(input.request);
    const yyyyMMdd = formatDateToYYYYMMDD(uploadDate);
    const mediaUrl = buildUploadedMediaUrl(apiBaseUrl, yyyyMMdd, uniqueFilename);

    uploadedMedia.push({
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      mime: media.mime,
      size: media.size,
      mediaUrl,
      thumbnailUrl: buildUploadedThumbnailUrl(apiBaseUrl, yyyyMMdd, uniqueFilename),
      accountName: media.accountName,
      caption: media.caption,
      uploadBatchId: media.uploadBatchId,
      uploadedAt: media.uploadedAt.toISOString()
    });
  }

  const firstItem = uploadedMedia[0];
  return {
    storageTarget: 'SHARED' as StorageTarget,
    accountId: input.accountName,
    postId: null,
    archiveUrl: firstItem?.mediaUrl ?? null,
    uploadedAt: firstItem?.uploadedAt ?? new Date().toISOString(),
    fileCount: uploadedMedia.length,
    uploadBatchId,
    media: uploadedMedia,
    shouldRunIndexer: false
  };
}

async function saveToSource(input: {
  files: BufferedUploadFile[];
  accountId: string;
  postedAt: { date: Date; timestampBase: string };
  type: SourceUploadType;
  caption?: string;
  request: FastifyRequest;
}) {
  const sourceDir = getSourcePath(input.accountId, input.postedAt.date);
  await mkdir(sourceDir, { recursive: true });

  const savedFiles: Array<{ filename: string; filepath: string }> = [];
  const totalFiles = input.files.length;

  for (const [index, entry] of input.files.entries()) {
    const validation = validateFileType(entry.file.mimetype, entry.buffer.length);
    if (!validation.valid) {
      throw new IngestClientError(validation.error || 'Invalid file');
    }

    const ext = resolveFileExtension(entry.file);
    const fileSuffix = totalFiles === 1 ? `_UTC${ext}` : `_UTC_${index + 1}${ext}`;
    const filename = `${input.postedAt.timestampBase}${fileSuffix}`;
    const filepath = path.join(sourceDir, filename);
    await writeFile(filepath, entry.buffer);
    savedFiles.push({ filename, filepath });
  }

  let captionFile: string | null = null;
  if (input.caption !== undefined) {
    const filename = `${input.postedAt.timestampBase}_UTC.txt`;
    const filepath = path.join(sourceDir, filename);
    await writeFile(filepath, input.caption);
    captionFile = filepath;
  }

  const metadataFilename = `${input.postedAt.timestampBase}_UTC.json`;
  const metadataPath = path.join(sourceDir, metadataFilename);
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        instaloader: {
          node_type: input.type === 'Story' ? 'StoryItem' : 'Post'
        }
      },
      null,
      2
    )
  );

  const postId = `${input.postedAt.timestampBase}_UTC`;
  const apiBaseUrl = getApiBaseUrl(input.request);

  return {
    storageTarget: 'SOURCE' as StorageTarget,
    accountId: input.accountId,
    postId,
    archiveUrl: `${getWebBaseUrl(apiBaseUrl)}/post/${encodeURIComponent(postId)}`,
    uploadedAt: input.postedAt.date.toISOString(),
    fileCount: savedFiles.length,
    uploadBatchId: null,
    savedFiles,
    captionFile,
    metadataFile: metadataPath,
    shouldRunIndexer: true
  };
}

export async function registerMobileIngestRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/mobile/instagram-ingest', async (request, reply) => {
    if (!requireMobileIngestAuth(request, reply)) {
      return reply;
    }

    try {
      const input = await readMobileIngestForm(request);
      if (input.files.length === 0) {
        return sendError(reply, 'files are required', 400, 'BAD_REQUEST');
      }

      const existingAccount = input.accountName
        ? await prisma.account.findUnique({
          where: { id: input.accountName },
          select: { id: true }
        })
        : null;
      const postedAt = parsePostedAt(input.uploadedAt);

      if (existingAccount && !postedAt) {
        return sendError(
          reply,
          'uploadedAt must be a valid ISO 8601 datetime for existing accounts',
          400,
          'BAD_REQUEST'
        );
      }

      const data = existingAccount && postedAt
        ? await saveToSource({
          files: input.files,
          accountId: existingAccount.id,
          postedAt,
          type: toSourceUploadType(input.contentType),
          caption: input.caption,
          request
        })
        : await saveToShared({
          files: input.files,
          accountName: input.accountName,
          caption: input.caption,
          request
        });

      return sendSuccess(reply, data);
    } catch (error) {
      request.log.error(error, 'Mobile ingest failed');
      const message = error instanceof Error ? error.message : 'Mobile ingest failed';
      if (error instanceof IngestClientError) {
        return sendError(reply, message, error.statusCode, error.code);
      }

      return sendError(reply, 'Mobile ingest failed');
    }
  });

  app.post('/api/mobile/indexer/run', async (request, reply) => {
    if (!requireMobileIngestAuth(request, reply)) {
      return reply;
    }

    scheduleIndexerRun('mobile-ingest');
    if (process.env.NODE_ENV === 'test') {
      await triggerIndexerRun('mobile-ingest');
    }

    return sendSuccess(reply, { scheduled: true }, 202);
  });
}
