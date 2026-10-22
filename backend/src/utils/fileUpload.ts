import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { MultipartFile } from '@fastify/multipart';
import { formatDateToYYYYMMDD } from './dateFormat.js';
import { resolveSourceAccountPath } from './sourceRoot.js';

const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MiB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const MEDIA_TYPES: Record<string, { mime: string; extension: string }> = {
  '.jpg': { mime: 'image/jpeg', extension: '.jpg' },
  '.jpeg': { mime: 'image/jpeg', extension: '.jpg' },
  '.png': { mime: 'image/png', extension: '.png' },
  '.gif': { mime: 'image/gif', extension: '.gif' },
  '.webp': { mime: 'image/webp', extension: '.webp' },
  '.mp4': { mime: 'video/mp4', extension: '.mp4' },
  '.mov': { mime: 'video/quicktime', extension: '.mov' },
  '.webm': { mime: 'video/webm', extension: '.webm' }
};

export function getSafeMediaType(filename: string) {
  return MEDIA_TYPES[path.extname(filename).toLowerCase()];
}

export function validateMediaHeader(filename: string, mimetype: string, header: Buffer) {
  const expected = getSafeMediaType(filename);
  const declared = mimetype === 'image/jpg' ? 'image/jpeg' : mimetype;
  if (!expected || expected.mime !== declared) return null;

  let detected: string | null = null;
  if (header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) detected = 'image/jpeg';
  else if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) detected = 'image/png';
  else if (['GIF87a', 'GIF89a'].includes(header.subarray(0, 6).toString('ascii'))) detected = 'image/gif';
  else if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') detected = 'image/webp';
  else if (header.length >= 12 && header.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = header.subarray(8, 12).toString('ascii');
    if (brand === 'qt  ') detected = 'video/quicktime';
    else if (/^(isom|iso[2-9]|mp4[12]|avc1|M4V |M4A |MSNV|dash)$/.test(brand)) detected = 'video/mp4';
  } else if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && header.includes(Buffer.from('webm'))) {
    detected = 'video/webm';
  }
  return detected === expected.mime ? expected : null;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileType(mimetype: string, filesize: number): FileValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimetype);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimetype);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimetype}. Allowed types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`
    };
  }

  if (isImage && filesize > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image file size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`
    };
  }

  if (isVideo && filesize > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video file size exceeds maximum allowed size of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`
    };
  }

  return { valid: true };
}

export function getUploadPath(date: Date = new Date()): string {
  const yyyyMMdd = formatDateToYYYYMMDD(date);

  // imagor의 FILE_LOADER_BASE_DIR이 /data이므로 /data/uploaded/에 저장
  const dataRoot = process.env.DATA_ROOT ?? '/data';
  return path.join(dataRoot, 'uploaded', yyyyMMdd);
}

export function getSourcePath(accountId: string, _date: Date = new Date()): string {
  return resolveSourceAccountPath(accountId);
}

export async function saveUploadedFile(
  file: MultipartFile,
  filename: string,
  uploadedAt: Date = new Date()
): Promise<{ filepath: string; size: number }> {
  const uploadDir = getUploadPath(uploadedAt);
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);

  console.log(`Saving file to ${filepath}`);
  const buffer = await file.toBuffer();

  await writeFile(filepath, buffer);

  return {
    filepath,
    size: buffer.length
  };
}

export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}${ext}`;
}
