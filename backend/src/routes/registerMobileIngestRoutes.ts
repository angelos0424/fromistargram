import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { mkdir, readFile, writeFile } from 'fs/promises';
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

type MobileIngestContentType = 'POST' | 'STORY' | 'REEL' | 'HIGHLIGHT';
type SourceUploadType = 'Post' | 'Story';
type StorageTarget = 'SOURCE' | 'SHARED' | 'HIGHLIGHT';

type BufferedUploadFile = {
  file: MultipartFile;
  buffer: Buffer;
};

type ParsedPostedAt = {
  date: Date;
  timestampBase: string;
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
    .replace(/[^a-z0-9._-]+/g, '_');

  return normalized || null;
}

function normalizeHighlightTitle(value?: string): string | null {
  const normalized = (value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+$/g, '')
    .replace(/^_+|_+$/g, '');

  return normalized || null;
}

function parseContentType(value?: string): MobileIngestContentType {
  if (value === 'STORY' || value === 'REEL' || value === 'POST' || value === 'HIGHLIGHT') {
    return value;
  }

  return 'POST';
}

function toSourceUploadType(contentType: MobileIngestContentType): SourceUploadType {
  return contentType === 'STORY' ? 'Story' : 'Post';
}

function buildTimestampBase(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const HH = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${MM}-${dd}_${HH}-${mm}-${ss}`;
}

function parsePostedAt(value?: string): ParsedPostedAt | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    timestampBase: buildTimestampBase(date)
  };
}

function buildUtcDate(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string,
  second: string
): Date | null {
  const yyyy = Number(year);
  const MM = Number(month);
  const dd = Number(day);
  const HH = Number(hour);
  const mm = Number(minute);
  const ss = Number(second);
  const date = new Date(Date.UTC(yyyy, MM - 1, dd, HH, mm, ss));

  if (
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() !== MM - 1 ||
    date.getUTCDate() !== dd ||
    date.getUTCHours() !== HH ||
    date.getUTCMinutes() !== mm ||
    date.getUTCSeconds() !== ss
  ) {
    return null;
  }

  return date;
}

function parsePostedAtFromFilename(filename?: string): ParsedPostedAt | null {
  const basename = path.basename(filename ?? '');

  const dashed = basename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:_UTC)?/i);
  if (dashed) {
    const date = buildUtcDate(dashed[1], dashed[2], dashed[3], dashed[4], dashed[5], dashed[6]);
    return date ? { date, timestampBase: buildTimestampBase(date) } : null;
  }

  const compact = basename.match(/(?:^|[_-])(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})(?:[_-]|\.|$)/);
  if (compact) {
    const date = buildUtcDate(compact[1], compact[2], compact[3], compact[4], compact[5], compact[6]);
    return date ? { date, timestampBase: buildTimestampBase(date) } : null;
  }

  return null;
}

function resolveFileExtension(file: MultipartFile): string {
  return path.extname(file.filename ?? '');
}

function generateSharedFilename(originalFilename: string, postedAt: ParsedPostedAt, index: number, totalFiles: number): string {
  const ext = path.extname(originalFilename);
  const unique = randomUUID().slice(0, 8);
  const fileSuffix = totalFiles === 1
    ? `_UTC_${unique}${ext}`
    : `_UTC_${index + 1}_${unique}${ext}`;

  return `${postedAt.timestampBase}${fileSuffix}`;
}

function toComparableBuffer(data: Buffer | string): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

async function isExistingFileIdentical(filepath: string, data: Buffer | string): Promise<boolean> {
  const existing = await readFile(filepath);
  return existing.equals(toComparableBuffer(data));
}

async function ensureSourceFileCanBeWritten(filepath: string, data: Buffer | string): Promise<void> {
  try {
    const isIdentical = await isExistingFileIdentical(filepath, data);
    if (isIdentical) {
      return;
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }

    throw error;
  }

  throw new IngestClientError(
    `Source file already exists with different content: ${path.basename(filepath)}`,
    409,
    'CONFLICT'
  );
}

export async function writeSourceFileAllowingIdenticalOverwrite(
  filepath: string,
  data: Buffer | string
): Promise<void> {
  try {
    await writeFile(filepath, data, { flag: 'wx' });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'EEXIST'
    ) {
      await ensureSourceFileCanBeWritten(filepath, data);
      await writeFile(filepath, data);
      return;
    }

    throw error;
  }
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
  highlightTitle: string | null;
}> {
  const files: BufferedUploadFile[] = [];
  let accountName: string | null = null;
  let uploadedAt: string | undefined;
  let contentType: MobileIngestContentType = 'POST';
  let caption: string | undefined;
  let highlightTitle: string | null = null;

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
      case 'highlightTitle':
        highlightTitle = normalizeHighlightTitle(value);
        break;
      default:
        break;
    }
  }

  return { files, accountName, uploadedAt, contentType, caption, highlightTitle };
}

async function saveToShared(input: {
  files: BufferedUploadFile[];
  accountName: string | null;
  caption?: string;
  postedAt: ParsedPostedAt | null;
  request: FastifyRequest;
}) {
  const uploadBatchId = randomUUID();
  const uploadedMedia = [];
  const fallbackDate = new Date();

  for (const [index, { file, buffer }] of input.files.entries()) {
    const validation = validateFileType(file.mimetype, buffer.length);
    if (!validation.valid) {
      throw new IngestClientError(validation.error || 'Invalid file');
    }

    const filenamePostedAt = input.postedAt ?? parsePostedAtFromFilename(file.filename);
    const uploadDate = filenamePostedAt?.date ?? fallbackDate;
    const uniqueFilename = filenamePostedAt
      ? generateSharedFilename(file.filename, filenamePostedAt, index, input.files.length)
      : generateUniqueFilename(file.filename);
    const { size } = await saveUploadedFile(
      {
        ...file,
        toBuffer: async () => buffer
      } as MultipartFile,
      uniqueFilename,
      uploadDate
    );

    const media = await createSharedMedia({
      filename: uniqueFilename,
      originalName: file.filename,
      mime: file.mimetype,
      size,
      accountName: input.accountName ?? undefined,
      caption: uploadedMedia.length === 0 ? input.caption : undefined,
      uploadBatchId,
      uploadedAt: uploadDate
    });

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

  const totalFiles = input.files.length;
  const mediaFiles = input.files.map((entry, index) => {
    const validation = validateFileType(entry.file.mimetype, entry.buffer.length);
    if (!validation.valid) {
      throw new IngestClientError(validation.error || 'Invalid file');
    }

    const ext = resolveFileExtension(entry.file);
    const fileSuffix = totalFiles === 1 ? `_UTC${ext}` : `_UTC_${index + 1}${ext}`;
    const filename = `${input.postedAt.timestampBase}${fileSuffix}`;
    const filepath = path.join(sourceDir, filename);
    return { filename, filepath, buffer: entry.buffer };
  });

  const captionPath = input.caption !== undefined
    ? path.join(sourceDir, `${input.postedAt.timestampBase}_UTC.txt`)
    : null;

  const metadataFilename = `${input.postedAt.timestampBase}_UTC.json`;
  const metadataPath = path.join(sourceDir, metadataFilename);
  const metadataContent = JSON.stringify(
    {
      instaloader: {
        node_type: input.type === 'Story' ? 'StoryItem' : 'Post'
      }
    },
    null,
    2
  );
  const sourceFiles = [
    ...mediaFiles.map((file) => ({ filepath: file.filepath, data: file.buffer })),
    ...(captionPath !== null && input.caption !== undefined
      ? [{ filepath: captionPath, data: input.caption }]
      : []),
    {
      filepath: metadataPath,
      data: metadataContent
    }
  ];

  await Promise.all(sourceFiles.map((file) => ensureSourceFileCanBeWritten(file.filepath, file.data)));

  const savedFiles: Array<{ filename: string; filepath: string }> = [];
  for (const file of mediaFiles) {
    await writeSourceFileAllowingIdenticalOverwrite(file.filepath, file.buffer);
    savedFiles.push({ filename: file.filename, filepath: file.filepath });
  }

  if (captionPath !== null && input.caption !== undefined) {
    await writeSourceFileAllowingIdenticalOverwrite(captionPath, input.caption);
  }

  await writeSourceFileAllowingIdenticalOverwrite(metadataPath, metadataContent);

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
    captionFile: captionPath,
    metadataFile: metadataPath,
    shouldRunIndexer: true
  };
}

async function saveToHighlight(input: {
  files: BufferedUploadFile[];
  accountId: string;
  highlightTitle: string;
  postedAt: { date: Date; timestampBase: string };
}) {
  const highlightDir = path.join(getSourcePath(input.accountId, input.postedAt.date), input.highlightTitle);
  await mkdir(highlightDir, { recursive: true });

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
    const filepath = path.join(highlightDir, filename);
    await writeFile(filepath, entry.buffer);
    savedFiles.push({ filename, filepath });
  }

  return {
    storageTarget: 'HIGHLIGHT' as StorageTarget,
    accountId: input.accountId,
    highlightTitle: input.highlightTitle,
    postId: null,
    archiveUrl: null,
    uploadedAt: input.postedAt.date.toISOString(),
    fileCount: savedFiles.length,
    uploadBatchId: null,
    savedFiles,
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

      if (input.contentType === 'HIGHLIGHT') {
        if (!input.accountName) {
          return sendError(reply, 'accountName is required for highlight uploads', 400, 'BAD_REQUEST');
        }

        if (!existingAccount) {
          return sendError(reply, 'Account not found for highlight upload', 404, 'NOT_FOUND');
        }

        if (!input.highlightTitle) {
          return sendError(reply, 'highlightTitle is required for highlight uploads', 400, 'BAD_REQUEST');
        }

        if (!postedAt) {
          return sendError(
            reply,
            'uploadedAt must be a valid ISO 8601 datetime for highlight uploads',
            400,
            'BAD_REQUEST'
          );
        }

        const data = await saveToHighlight({
          files: input.files,
          accountId: existingAccount.id,
          highlightTitle: input.highlightTitle,
          postedAt
        });

        return sendSuccess(reply, data);
      }

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
          postedAt,
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
