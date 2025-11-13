import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer, type BuildServerOptions } from '../../server.js';

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
      data: (typeof samplePost)[];
      total: number;
      pageInfo: { hasNextPage: boolean; nextCursor: string | null };
    };

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({
      id: samplePost.id,
      accountId: samplePost.accountId,
      media: expect.any(Array),
      postedAt: expect.any(String)
    });
    expect(body.pageInfo).toEqual({ hasNextPage: false, nextCursor: null });
    expect(body.total).toBe(1);
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
