import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer, type BuildServerOptions } from '../../server.js';
import { writeSourceFileAllowingIdenticalOverwrite } from '../registerMobileIngestRoutes.js';

vi.mock('../../db/client.js', () => ({
  prisma: {}
}));

vi.mock('../../services/postsService.js', async () => {
  const actual = await vi.importActual<typeof import('../../services/postsService.js')>(
    '../../services/postsService.js'
  );

  return {
    ...actual,
    listPosts: vi.fn(),
    getPostById: vi.fn()
  };
});

const { listPosts, getPostById } = await import('../../services/postsService.js');

function createServer(options: BuildServerOptions = {}) {
  return buildServer({ logger: false, ...options });
}

describe('Post routes contract', () => {
  const samplePost = {
    id: 'post_1',
    accountId: 'fromis_9',
    caption: 'Hello world',
    postedAt: new Date().toISOString(),
    hasText: true,
    textContent: 'Hello world',
    media: [
      {
        id: 'media_1',
        orderIndex: 0,
        filename: '2024-01-01_12-00-00_UTC_1.jpg',
        mime: 'image/jpeg',
        width: null,
        height: null,
        duration: null,
        type: 'image' as const,
        mediaUrl: '/api/media/fromis_9/2024-01-01_12-00-00_UTC_1.jpg',
        thumbnailUrl: '/api/media/fromis_9/2024-01-01_12-00-00_UTC_1.jpg'
      }
    ],
    tags: ['fromis_9']
  };

  let app: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    (listPosts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [samplePost],
      total: 1,
      pageInfo: { hasNextPage: false, nextCursor: null }
    });

    (getPostById as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      if (id === samplePost.id) {
        return samplePost;
      }
      return null;
    });

    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns paginated posts', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/posts?limit=10' });
    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      success: true;
      data: (typeof samplePost)[];
      meta: {
        total: number;
        pageInfo: { hasNextPage: boolean; nextCursor: string | null };
      };
    };

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({
      id: samplePost.id,
      accountId: samplePost.accountId,
      media: expect.any(Array),
      postedAt: expect.any(String)
    });
    expect(body.meta.pageInfo).toEqual({ hasNextPage: false, nextCursor: null });
    expect(body.meta.total).toBe(1);
  });

  it('returns a single post when found', async () => {
    const response = await app.inject({ method: 'GET', url: `/api/posts/${samplePost.id}` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: typeof samplePost };
    expect(body.data.id).toBe(samplePost.id);
  });

  it('returns 404 when post is missing', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/posts/unknown' });
    expect(response.statusCode).toBe(404);
  });
});

describe('mobile ingest source file writes', () => {
  let tempDir: string | null = null;

  async function createTempFilePath(filename: string): Promise<string> {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-mobile-ingest-'));
    return path.join(tempDir, filename);
  }

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('writes a new source file', async () => {
    const filepath = await createTempFilePath('new.jpg');

    await writeSourceFileAllowingIdenticalOverwrite(filepath, Buffer.from('image-data'));

    await expect(readFile(filepath, 'utf8')).resolves.toBe('image-data');
  });

  it('allows overwriting an existing source file when content is identical', async () => {
    const filepath = await createTempFilePath('same.jpg');
    await writeFile(filepath, Buffer.from('same-image-data'));

    await writeSourceFileAllowingIdenticalOverwrite(filepath, Buffer.from('same-image-data'));

    await expect(readFile(filepath, 'utf8')).resolves.toBe('same-image-data');
  });

  it('rejects an existing source file when content differs', async () => {
    const filepath = await createTempFilePath('different.jpg');
    await writeFile(filepath, Buffer.from('old-image-data'));

    await expect(
      writeSourceFileAllowingIdenticalOverwrite(filepath, Buffer.from('new-image-data'))
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409
    });

    await expect(readFile(filepath, 'utf8')).resolves.toBe('old-image-data');
  });
});
