import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { MultipartFile } from '@fastify/multipart';

const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const yyyyMMdd = `${year}${month}${day}`;

  const resultRoot = process.env.RESULT_ROOT ?? '/result';
  return path.join(resultRoot, 'uploaded', yyyyMMdd);
}

export async function saveUploadedFile(
  file: MultipartFile,
  filename: string
): Promise<{ filepath: string; size: number }> {
  const uploadDir = getUploadPath();
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
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
