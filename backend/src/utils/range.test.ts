import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sendFileWithRange } from './range.js';

async function createTempFile(content: Buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), 'range-test-'));
  const filePath = path.join(dir, 'sample.bin');
  await writeFile(filePath, content);
  return { dir, filePath };
}

describe('sendFileWithRange', () => {
  let app: Fastify.FastifyInstance;
  let tempDir: string | undefined;

  beforeEach(async () => {
    app = Fastify();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('serves full files when no range header is provided', async () => {
    const { dir, filePath } = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
    tempDir = dir;
    app.get('/media', async (_, reply) => sendFileWithRange(reply, { filePath }));

    const response = await app.inject({ method: 'GET', url: '/media' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('abcdefghij');
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-length']).toBe('10');
    expect(response.headers['cache-control']).toContain('max-age');
    expect(response.headers['last-modified']).toBeDefined();
  });

  it('serves partial content for valid ranges', async () => {
    const { dir, filePath } = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
    tempDir = dir;
    app.get('/media', async (request, reply) =>
      sendFileWithRange(reply, { filePath, rangeHeader: request.headers.range as string })
    );

    const response = await app.inject({
      method: 'GET',
      url: '/media',
      headers: { range: 'bytes=2-5' }
    });

    expect(response.statusCode).toBe(206);
    expect(response.body).toBe('cdef');
    expect(response.headers['content-range']).toBe('bytes 2-5/10');
  });

  it('returns 416 for invalid ranges', async () => {
    const { dir, filePath } = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
    tempDir = dir;
    app.get('/media', async (request, reply) =>
      sendFileWithRange(reply, { filePath, rangeHeader: request.headers.range as string })
    );

    const response = await app.inject({
      method: 'GET',
      url: '/media',
      headers: { range: 'bytes=999-20' }
    });

    expect(response.statusCode).toBe(416);
  });
});
