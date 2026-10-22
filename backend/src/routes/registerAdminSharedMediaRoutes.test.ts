import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../services/sharedMediaService.js', () => ({
  listSharedMedia: mocks.list, updateSharedMediaCaption: vi.fn(), softDeleteSharedMedia: vi.fn(), getSharedMediaById: vi.fn()
}));
import { registerAdminSharedMediaRoutes } from './registerAdminSharedMediaRoutes.js';
let app: FastifyInstance;
beforeEach(async () => {
  mocks.list.mockReset().mockResolvedValue({ data: [], total: 0, hasMore: false, nextCursor: null });
  app = Fastify({ logger: false });
  // Test route validation in isolation. Production registration adds admin auth.
  await app.register(registerAdminSharedMediaRoutes);
});
afterEach(async () => { await app.close(); });

describe('administrator shared-media date filters', () => {
  it.each(['from=2026-02-31', 'to=not-a-date', 'from=2026-10-23T10%3A00%3A00'])('rejects invalid query %s before calling the service', async (query) => {
    const response = await app.inject({ url: `/api/admin/shared?${query}` });
    expect(response.statusCode).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('accepts KST days and timezone-qualified instants', async () => {
    const response = await app.inject({ url: '/api/admin/shared?from=2026-10-23&to=2026-10-23T14%3A59%3A59Z' });
    expect(response.statusCode).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-23', to: '2026-10-23T14:59:59Z' }));
  });
});
