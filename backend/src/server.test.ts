import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import pino from 'pino';
import { buildServer, type BuildServerOptions } from './server.js';

vi.mock('./db/client.js', () => ({ prisma: {} }));

describe('Fastify server startup', () => {
  let app: FastifyInstance | undefined;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'silent');
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  it('starts with the production logger and all plugins, exposing health and OpenAPI', async () => {
    app = await buildServer({ enablePrettyLogs: false });
    await app.ready();

    const health = await app.inject({ method: 'GET', url: '/healthz' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok' });

    const docs = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(docs.statusCode).toBe(200);
    expect(docs.json().paths).toHaveProperty('/api/posts');
    expect(docs.json().paths['/api/media/{account}/{*}'].get.responses).toHaveProperty('400');
  });

  it.each([
    ['disabled', { logger: false }, undefined],
    ['configuration object', { logger: { level: 'warn' } }, 'warn']
  ] satisfies [string, BuildServerOptions, string | undefined][])('accepts a %s logger option', async (_name, options, level) => {
    app = await buildServer(options);
    await app.ready();
    expect(app.log.level).toBe(level);
    expect((await app.inject('/healthz')).statusCode).toBe(200);
  });

  it.each(['logger', 'loggerInstance'] as const)('preserves a supplied %s and logs fallback response timing', async (option) => {
    const entries: Record<string, unknown>[] = [];
    const logger = pino({ level: 'info', base: { component: 'custom-test-logger' } }, {
      write: (line) => { entries.push(JSON.parse(line)); }
    });
    app = await buildServer({ [option]: logger });
    app.get('/timing-fallback', {
      onRequest(request, _reply, done) {
        delete (request as FastifyRequest & { metricsStart?: bigint }).metricsStart;
        done();
      }
    }, async () => ({ status: 'ok' }));
    await app.ready();

    const response = await app.inject('/timing-fallback');
    expect(response.statusCode).toBe(200);
    const entry = entries.find((item) => item.msg === 'request completed');
    expect(entry).toMatchObject({ component: 'custom-test-logger', route: '/timing-fallback', statusCode: 200 });
    expect(Number.isFinite(entry?.durationMs)).toBe(true);
    expect(entry?.durationMs).toBeGreaterThanOrEqual(0);
  });
});
