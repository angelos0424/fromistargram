import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  scheduleIndexerRun: vi.fn(),
  triggerIndexerRun: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../db/client.js', () => ({
  prisma: {
    account: { findUnique: mocks.findUnique }
  }
}));

vi.mock('../services/indexerService.js', () => ({
  scheduleIndexerRun: mocks.scheduleIndexerRun,
  triggerIndexerRun: mocks.triggerIndexerRun
}));

import { registerMobileIngestRoutes } from './registerMobileIngestRoutes.js';

const originalCrawlOutputDir = process.env.CRAWL_OUTPUT_DIR;
const originalMobileIngestToken = process.env.MOBILE_INGEST_TOKEN;
const originalNodeEnv = process.env.NODE_ENV;
let app: FastifyInstance | null = null;
let sourceRoot: string | null = null;
const JPEG_A = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('profile-photo-a')
]);
const JPEG_B = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('profile-photo-b')
]);
const PNG_A = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('profile-photo-png')
]);

function multipartPayload(parts: Array<
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; data: Buffer }
>): { body: Buffer; contentType: string } {
  const boundary = '----fromistargram-profile-photo-test';
  const chunks: Buffer[] = [];

  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if ('filename' in part) {
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
        `Content-Type: ${part.contentType}\r\n\r\n`
      ));
      chunks.push(part.data, Buffer.from('\r\n'));
    } else {
      chunks.push(Buffer.from(
        `Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`
      ));
    }
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function injectProfilePhoto(parts: Parameters<typeof multipartPayload>[0], authenticated = true) {
  const payload = multipartPayload(parts);
  return app!.inject({
    method: 'POST',
    url: '/api/mobile/profile-photo-ingest',
    headers: {
      'content-type': payload.contentType,
      ...(authenticated ? { authorization: 'Bearer test-mobile-token' } : {})
    },
    payload: payload.body
  });
}

beforeEach(async () => {
  sourceRoot = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-profile-ingest-'));
  process.env.CRAWL_OUTPUT_DIR = sourceRoot;
  process.env.MOBILE_INGEST_TOKEN = 'test-mobile-token';
  process.env.NODE_ENV = 'test';
  mocks.findUnique.mockReset();
  mocks.findUnique.mockResolvedValue({ id: 'test_user' });
  mocks.scheduleIndexerRun.mockReset();
  mocks.triggerIndexerRun.mockReset().mockResolvedValue(undefined);

  app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(registerMobileIngestRoutes);
});

afterEach(async () => {
  await app?.close();
  app = null;
  if (sourceRoot) {
    await rm(sourceRoot, { recursive: true, force: true });
    sourceRoot = null;
  }

  if (originalCrawlOutputDir === undefined) delete process.env.CRAWL_OUTPUT_DIR;
  else process.env.CRAWL_OUTPUT_DIR = originalCrawlOutputDir;
  if (originalMobileIngestToken === undefined) delete process.env.MOBILE_INGEST_TOKEN;
  else process.env.MOBILE_INGEST_TOKEN = originalMobileIngestToken;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe('POST /api/mobile/profile-photo-ingest', () => {
  const validFields = [
    { name: 'accountName', value: ' @Test_User ' },
    { name: 'capturedAt', value: '2026-08-09T12:34:56+09:00' },
    {
      name: 'file',
      filename: 'avatar.JPG',
      contentType: 'image/jpeg',
      data: JPEG_A
    }
  ] as const;

  it('requires mobile ingest authentication', async () => {
    const response = await injectProfilePhoto([...validFields], false);

    expect(response.statusCode).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('writes one normalized profile photo without post artifacts and awaits indexing in tests', async () => {
    const response = await injectProfilePhoto([...validFields]);

    expect(response.statusCode).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'test_user' },
      select: { id: true }
    });
    expect(mocks.scheduleIndexerRun).toHaveBeenCalledWith('mobile-profile-photo-ingest');
    expect(mocks.triggerIndexerRun).toHaveBeenCalledWith('mobile-profile-photo-ingest');

    const accountDir = path.join(sourceRoot!, 'test_user');
    const files = await readdir(accountDir);
    expect(files).toEqual(['2026-08-09_03-34-56_UTC_profile_pic.jpg']);
    expect(await readFile(path.join(accountDir, files[0]))).toEqual(JPEG_A);
    const responseBody = response.json();
    expect(responseBody).toMatchObject({
      success: true,
      data: {
        accountId: 'test_user',
        uploadedAt: '2026-08-09T03:34:56.000Z',
        fileCount: 1,
        shouldRunIndexer: true,
        archiveUrl: 'http://localhost:80/api/media/test_user/2026-08-09_03-34-56_UTC_profile_pic.jpg'
      }
    });
    expect(responseBody.data).not.toHaveProperty('savedFiles');
    expect(JSON.stringify(responseBody)).not.toContain(sourceRoot!);
  });

  it('is idempotent for identical bytes and rejects conflicting bytes at the same second', async () => {
    const first = await injectProfilePhoto([...validFields]);
    const retry = await injectProfilePhoto([...validFields]);
    const conflict = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
        data: JPEG_B
      }
    ]);

    expect(first.statusCode).toBe(200);
    expect(retry.statusCode).toBe(200);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      success: false,
      error: { code: 'CONFLICT' }
    });
    expect(mocks.scheduleIndexerRun).toHaveBeenCalledTimes(2);
  });

  it('is idempotent across filename extensions and rejects a different format at the same second', async () => {
    const first = await injectProfilePhoto([...validFields]);
    const renamedRetry = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'avatar.jpeg',
        contentType: 'image/jpg',
        data: JPEG_A
      }
    ]);
    const crossFormatConflict = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'avatar.png',
        contentType: 'image/png',
        data: PNG_A
      }
    ]);

    expect(first.statusCode).toBe(200);
    expect(renamedRetry.statusCode).toBe(200);
    expect(crossFormatConflict.statusCode).toBe(409);
    expect(await readdir(path.join(sourceRoot!, 'test_user'))).toEqual([
      '2026-08-09_03-34-56_UTC_profile_pic.jpg'
    ]);
  });

  it('reuses an identical legacy .jpeg file without creating a parallel .jpg', async () => {
    const accountDir = path.join(sourceRoot!, 'test_user');
    const legacyFilename = '2026-08-09_03-34-56_UTC_profile_pic.jpeg';
    await mkdir(accountDir, { recursive: true });
    await writeFile(path.join(accountDir, legacyFilename), JPEG_A);

    const response = await injectProfilePhoto([...validFields]);

    expect(response.statusCode).toBe(200);
    expect(await readdir(accountDir)).toEqual([legacyFilename]);
    expect(response.json()).toMatchObject({
      success: true,
      data: { filename: legacyFilename }
    });
  });

  it('serializes concurrent writes for one logical account timestamp', async () => {
    const [jpegResponse, pngResponse] = await Promise.all([
      injectProfilePhoto([...validFields]),
      injectProfilePhoto([
        ...validFields.slice(0, 2),
        {
          name: 'file',
          filename: 'avatar.png',
          contentType: 'image/png',
          data: PNG_A
        }
      ])
    ]);

    expect([jpegResponse.statusCode, pngResponse.statusCode].sort()).toEqual([200, 409]);
    expect((await readdir(path.join(sourceRoot!, 'test_user'))).length).toBe(1);
    expect(mocks.scheduleIndexerRun).toHaveBeenCalledTimes(1);
  });

  it('rejects zero or multiple files', async () => {
    const noFile = await injectProfilePhoto(validFields.slice(0, 2));
    const multipleFiles = await injectProfilePhoto([
      ...validFields,
      {
        name: 'files',
        filename: 'second.png',
        contentType: 'image/png',
        data: Buffer.from('second')
      }
    ]);

    expect(noFile.statusCode).toBe(400);
    expect(multipleFiles.statusCode).toBe(413);
    expect(mocks.scheduleIndexerRun).not.toHaveBeenCalled();
  });

  it('maps excess multipart fields to a bounded client error', async () => {
    const response = await injectProfilePhoto([
      validFields[0],
      validFields[1],
      { name: 'unexpected', value: 'extra' },
      validFields[2]
    ]);

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE' }
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('rejects MIME-spoofed and mismatched image payloads', async () => {
    const spoofed = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
        data: Buffer.from('not-an-image')
      }
    ]);
    const mismatched = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
        data: PNG_A
      }
    ]);

    expect(spoofed.statusCode).toBe(400);
    expect(mismatched.statusCode).toBe(400);
    expect(mocks.scheduleIndexerRun).not.toHaveBeenCalled();
  });

  it('rejects a profile image larger than the route-specific 30MB limit', async () => {
    const oversized = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(30 * 1024 * 1024, 1)
    ]);
    const response = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      {
        name: 'file',
        filename: 'oversized.jpg',
        contentType: 'image/jpeg',
        data: oversized
      }
    ]);

    expect(response.statusCode).toBe(413);
    expect(mocks.scheduleIndexerRun).not.toHaveBeenCalled();
  });

  it('rejects non-images, invalid capturedAt, unknown accounts, and traversal-shaped names', async () => {
    const video = await injectProfilePhoto([
      ...validFields.slice(0, 2),
      { name: 'file', filename: 'clip.mp4', contentType: 'video/mp4', data: Buffer.from('video') }
    ]);
    const invalidDate = await injectProfilePhoto([
      validFields[0],
      { name: 'capturedAt', value: '2026-08-09' },
      validFields[2]
    ]);
    mocks.findUnique.mockResolvedValueOnce(null);
    const unknown = await injectProfilePhoto([
      { name: 'accountName', value: '@missing' },
      validFields[1],
      validFields[2]
    ]);
    const traversal = await injectProfilePhoto([
      { name: 'accountName', value: '../escape' },
      validFields[1],
      validFields[2]
    ]);

    expect(video.statusCode).toBe(400);
    expect(invalidDate.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
    expect(traversal.statusCode).toBe(400);
    expect(mocks.scheduleIndexerRun).not.toHaveBeenCalled();
  });
});
