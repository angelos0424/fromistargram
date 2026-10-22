import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../../server.js';

vi.mock('../../db/client.js', () => ({
  prisma: {}
}));

describe('OpenAPI document', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes swagger json', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { openapi: string; info: { title: string } } & Record<string, any>;
    expect(body.openapi).toMatch(/^3\./u);
    expect(body.info.title).toBe('Fromistargram API');
    expect(body.paths).toHaveProperty('/api/posts');
  });
});
