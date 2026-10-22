import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { FastifyRequest } from 'fastify';
import { getSafeMediaType, validateFileType, validateMediaHeader } from './fileUpload.js';

export class UploadError extends Error {
  constructor(message: string, readonly statusCode = 400, readonly code = 'BAD_REQUEST') {
    super(message);
  }
}

function boundedLimit(name: string, maximum: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : maximum;
}

export function getUploadLimits() {
  return {
    files: boundedLimit('UPLOAD_MAX_FILES', 10),
    totalBytes: boundedLimit('UPLOAD_MAX_TOTAL_BYTES', 200 * 1024 * 1024),
    concurrent: boundedLimit('UPLOAD_MAX_CONCURRENT', 2)
  };
}

export type UploadPool = 'public' | 'admin';
const activeUploads: Record<UploadPool, number> = { public: 0, admin: 0 };

// Public traffic cannot consume the administrator's one reserved slot. Keep the
// existing public concurrency setting; total admission is bounded at 2 + 1.
// The caller must choose a pool, and only an authenticated handler may use admin.
export function acquireUploadSlot(pool: UploadPool): (() => void) | null {
  const limit = pool === 'admin' ? 1 : getUploadLimits().concurrent;
  if (activeUploads[pool] >= limit) return null;
  activeUploads[pool] += 1;
  let released = false;
  return () => {
    if (!released) activeUploads[pool] -= 1;
    released = true;
  };
}

export type StagedMedia = {
  filepath: string;
  originalName: string;
  mime: string;
  extension: string;
  size: number;
};

export type StagedUpload = {
  files: StagedMedia[];
  fields: Record<string, string>;
  cleanup: () => Promise<void>;
};

// Keep only the first 4 KiB in memory; all file bodies use stream backpressure.
// Admission across both pools bounds staged file data to 3 * 200 MiB by default.
export async function stageUpload(request: FastifyRequest, allowedFields: string[]): Promise<StagedUpload> {
  const limits = getUploadLimits();
  const directory = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-upload-'));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  const files: StagedMedia[] = [];
  const fields: Record<string, string> = Object.create(null);
  let totalBytes = 0;

  try {
    const parts = request.parts({
      limits: {
        files: limits.files,
        fields: allowedFields.length,
        parts: limits.files + allowedFields.length,
        fieldSize: 4096,
        fileSize: limits.totalBytes
      }
    });
    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.valueTruncated) throw new UploadError('Form field is too large', 413, 'PAYLOAD_TOO_LARGE');
        if (!allowedFields.includes(part.fieldname) || part.fieldname in fields || typeof part.value !== 'string') {
          throw new UploadError('Unexpected or duplicate form field');
        }
        fields[part.fieldname] = part.value;
        continue;
      }
      const expected = getSafeMediaType(part.filename);
      const mime = part.mimetype === 'image/jpg' ? 'image/jpeg' : part.mimetype;
      if (part.fieldname !== 'files' || !expected || expected.mime !== mime) {
        part.file.resume();
        throw new UploadError('File extension and media type must match a supported image or video');
      }
      const filepath = path.join(directory, String(files.length));
      let size = 0;
      let header = Buffer.alloc(0);
      const meter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length;
          totalBytes += chunk.length;
          if (totalBytes > limits.totalBytes) {
            callback(new UploadError('Combined upload size exceeds the request limit', 413, 'PAYLOAD_TOO_LARGE'));
            return;
          }
          const validation = validateFileType(mime, size);
          if (!validation.valid) {
            callback(new UploadError(validation.error ?? 'File is too large', 413, 'PAYLOAD_TOO_LARGE'));
            return;
          }
          if (header.length < 4096) header = Buffer.concat([header, chunk.subarray(0, 4096 - header.length)]);
          // Most format signatures fit in 12 bytes; WebM's DocType may be later.
          if (header.length >= 4096 && !validateMediaHeader(part.filename, mime, header)) {
            callback(new UploadError('File contents do not match the declared media type'));
            return;
          }
          callback(null, chunk);
        }
      });
      await pipeline(part.file, meter, createWriteStream(filepath, { flags: 'wx' }));
      if (part.file.truncated) throw new UploadError('File exceeds the upload limit', 413, 'PAYLOAD_TOO_LARGE');
      const detected = validateMediaHeader(part.filename, mime, header);
      if (!size || !detected) throw new UploadError('File contents do not match the declared media type');
      files.push({ filepath, originalName: part.filename, mime: detected.mime, extension: detected.extension, size });
    }
    if (!files.length) throw new UploadError('No files provided');
    return { files, fields, cleanup };
  } catch (error) {
    await cleanup();
    const code = (error as { code?: string }).code;
    if (code?.startsWith('FST_') && (code.includes('LIMIT') || code.includes('TOO_LARGE'))) {
      throw new UploadError('Multipart upload exceeds the request limit', 413, 'PAYLOAD_TOO_LARGE');
    }
    throw error;
  }
}
