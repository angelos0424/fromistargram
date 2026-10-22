import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMediaRoutes } from './registerMediaRoutes.js';
import { prisma } from '../db/client.js';

vi.mock('../db/client.js', () => ({
  prisma: {
    media: { findMany: vi.fn() },
    profilePic: { findMany: vi.fn() }
  }
}));

describe('media route invalid parameters', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.mocked(prisma.media.findMany).mockResolvedValue([{ post: { accountId: 'account' } }] as never);
    vi.mocked(prisma.profilePic.findMany).mockResolvedValue([]);
    app = Fastify({ logger: false });
    await registerMediaRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
    vi.clearAllMocks();
  });

  it.each([
    '/api/media/account/..%2Fprivate.jpg',
    '/api/media/by-filename/..%2Fprivate.jpg',
    '/api/media/uploaded/20261023/..%2Fprivate.jpg'
  ])('returns a serializable 400 response for %s', async (url) => {
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid path' });
  });

  it('returns a 400 validation response for an invalid upload date', async () => {
    const response = await app.inject('/api/media/uploaded/invalid/photo.jpg');
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('pattern');
  });
});
