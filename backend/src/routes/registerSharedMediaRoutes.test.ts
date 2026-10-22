import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { multipartPayload, MultipartTestPart, PNG } from '../testUtils/multipart.js';

const mocks = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), findAccount: vi.fn() }));
vi.mock('../services/sharedMediaService.js', () => ({
  createSharedMedia: mocks.create,
  listSharedMedia: mocks.list,
  getSharedMediaById: vi.fn()
}));
vi.mock('../db/client.js', () => ({ prisma: { account: { findUnique: mocks.findAccount } } }));
import { registerSharedMediaRoutes } from './registerSharedMediaRoutes.js';
import { registerMediaRoutes } from './registerMediaRoutes.js';
import { registerAdminManualUploadRoutes } from './registerAdminManualUploadRoutes.js';

let app: FastifyInstance;
let dataRoot: string;
const file: MultipartTestPart = { name: 'files', filename: 'image.PNG', contentType: 'image/png', data: PNG };

beforeEach(async () => {
  dataRoot = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-shared-security-'));
  vi.stubEnv('DATA_ROOT', dataRoot);
  vi.stubEnv('CRAWL_OUTPUT_DIR', path.join(dataRoot, 'source'));
  vi.stubEnv('UPLOAD_MAX_FILES', '10');
  vi.stubEnv('UPLOAD_MAX_TOTAL_BYTES', String(200 * 1024 * 1024));
  vi.stubEnv('UPLOAD_MAX_CONCURRENT', '2');
  mocks.create.mockReset().mockImplementation(async (data) => ({ id: 'shared-id', ...data }));
  mocks.list.mockReset().mockResolvedValue({ data: [], hasMore: false, nextCursor: null, total: 0 });
  mocks.findAccount.mockReset().mockResolvedValue({ id: 'admin-account' });
  app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(registerSharedMediaRoutes);
  await app.register(registerMediaRoutes);
  await app.register(async (adminApp) => {
    // Keep the production ordering: authenticate before entering the handler.
    // JWT verification itself has dedicated tests; this fixture tests admission.
    adminApp.addHook('preHandler', async (request, reply) => {
      if (request.headers.authorization !== 'Bearer test-admin') return reply.code(401).send();
    });
    await adminApp.register(registerAdminManualUploadRoutes);
  });
});

afterEach(async () => { await app.close(); await rm(dataRoot, { recursive: true, force: true }); vi.unstubAllEnvs(); });

function upload(parts: MultipartTestPart[]) {
  const body = multipartPayload(parts);
  return app.inject({ method: 'POST', url: '/api/shared/upload', headers: { 'content-type': body.contentType }, payload: body.body });
}

function manualUpload(second = '00', authenticated = true) {
  const body = multipartPayload([
    { name: 'accountId', value: 'admin-account' },
    { name: 'postedAt', value: `2026-10-23T03:00:${second}Z` },
    { name: 'type', value: 'Post' },
    file
  ]);
  return app.inject({
    method: 'POST', url: '/api/admin/manual-upload',
    headers: { 'content-type': body.contentType, ...(authenticated ? { authorization: 'Bearer test-admin' } : {}) },
    payload: body.body
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('public shared uploads', () => {
  it('stores verified image bytes with a server-controlled canonical extension', async () => {
    const response = await upload([file, { name: 'caption', value: 'test caption' }]);
    expect(response.statusCode).toBe(200);
    const media = response.json().data[0];
    expect(media.filename).toMatch(/^[0-9a-f-]+\.png$/);
    expect(media.mime).toBe('image/png');
    expect(media.caption).toBe('test caption');
    const stored = await app.inject({ url: new URL(media.mediaUrl).pathname });
    expect(stored.headers['content-type']).toBe('image/png');
    expect(stored.headers['x-content-type-options']).toBe('nosniff');
    expect(stored.rawPayload).toEqual(PNG);
  });

  it.each([
    { filename: 'payload.html', contentType: 'image/jpeg', data: Buffer.from('<script>alert(1)</script>') },
    { filename: 'payload.jpg', contentType: 'image/jpeg', data: Buffer.from('<html>spoofed image</html>') },
    { filename: 'payload.svg', contentType: 'image/svg+xml', data: Buffer.from('<svg/>') },
    { filename: 'payload.jpg', contentType: 'image/jpeg', data: PNG }
  ])('rejects spoofed or executable content: $filename / $contentType', async (payload) => {
    const response = await upload([file, { name: 'files', ...payload }]);
    expect(response.statusCode).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await readdir(dataRoot)).toEqual([]);
  });

  it('serves legacy executable extensions as attachments with a sandbox and nosniff', async () => {
    const directory = path.join(dataRoot, 'uploaded', '20261023');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'legacy.html'), '<script>alert(1)</script>');
    const response = await app.inject({ url: '/api/media/uploaded/20261023/legacy.html' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/octet-stream');
    expect(response.headers['content-disposition']).toBe('attachment');
    expect(response.headers['content-security-policy']).toContain('sandbox');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects excess file count before publishing any files', async () => {
    vi.stubEnv('UPLOAD_MAX_FILES', '1');
    const response = await upload([file, file]);
    expect(response.statusCode).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await readdir(dataRoot)).toEqual([]);
  });

  it('enforces the sum of streamed file bytes with a small test limit', async () => {
    vi.stubEnv('UPLOAD_MAX_TOTAL_BYTES', String(PNG.length * 2 - 1));
    const response = await upload([file, file]);
    expect(response.statusCode).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await readdir(dataRoot)).toEqual([]);
  });

  it('rejects a truncated file and oversized form field with bounded client errors', async () => {
    vi.stubEnv('UPLOAD_MAX_TOTAL_BYTES', String(PNG.length - 1));
    expect((await upload([file])).statusCode).toBe(413);
    vi.stubEnv('UPLOAD_MAX_TOTAL_BYTES', String(200 * 1024 * 1024));
    expect((await upload([{ name: 'caption', value: 'x'.repeat(4097) }, file])).statusCode).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await readdir(dataRoot)).toEqual([]);
  });

  it('bounds simultaneous uploads and releases the slot after completion', async () => {
    vi.stubEnv('UPLOAD_MAX_CONCURRENT', '1');
    let started!: () => void;
    let finish!: () => void;
    const reached = new Promise<void>((resolve) => { started = resolve; });
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    mocks.create.mockImplementationOnce(async (data) => { started(); await gate; return { id: 'first', ...data }; });
    const first = upload([file]);
    await reached;
    const second = await upload([file]);
    expect(second.statusCode).toBe(429);
    expect(second.headers['retry-after']).toBe('5');
    finish();
    expect((await first).statusCode).toBe(200);
    expect((await upload([file])).statusCode).toBe(200);
  });

  it('reserves admin capacity when public uploads are saturated and releases each pool independently', async () => {
    const publicStarted = deferred();
    const publicGate = deferred();
    const adminStarted = deferred();
    const adminGate = deferred();
    let publicCount = 0;
    mocks.create.mockImplementation(async (data) => {
      if (++publicCount === 2) publicStarted.resolve();
      await publicGate.promise;
      return { id: `public-${publicCount}`, ...data };
    });
    mocks.findAccount.mockImplementationOnce(async () => {
      adminStarted.resolve();
      await adminGate.promise;
      return { id: 'admin-account' };
    });
    const publicRequests = [upload([file]), upload([file])];
    let adminRequest: ReturnType<typeof manualUpload> | undefined;
    try {
      await publicStarted.promise;
      expect((await manualUpload('00', false)).statusCode).toBe(401);
      expect(mocks.findAccount).not.toHaveBeenCalled();
      adminRequest = manualUpload();
      await Promise.race([
        adminStarted.promise,
        adminRequest.then((response) => { throw new Error(`Admin upload rejected while public pool was full: ${response.statusCode}`); })
      ]);
      expect((await upload([file])).statusCode).toBe(429);
      expect((await manualUpload('01')).statusCode).toBe(429);

      publicGate.resolve();
      expect((await Promise.all(publicRequests)).map((response) => response.statusCode)).toEqual([200, 200]);
      expect((await upload([file])).statusCode).toBe(200);
      expect((await manualUpload('01')).statusCode).toBe(429);

      adminGate.resolve();
      expect((await adminRequest).statusCode).toBe(200);
      expect((await manualUpload('01')).statusCode).toBe(200);
    } finally {
      publicGate.resolve();
      adminGate.resolve();
      await Promise.allSettled([...publicRequests, ...(adminRequest ? [adminRequest] : [])]);
    }
  });

  it('removes an unpublished file after a database failure and releases admission', async () => {
    mocks.create.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await upload([file])).statusCode).toBe(500);
    const dates = await readdir(path.join(dataRoot, 'uploaded'));
    for (const date of dates) expect(await readdir(path.join(dataRoot, 'uploaded', date))).toEqual([]);
    expect((await upload([file])).statusCode).toBe(200);
  });

  it('passes a bounded global search and rejects impossible dates', async () => {
    const response = await app.inject({ url: '/api/shared?search=%20caption%20&from=2026-10-23&to=2026-10-23' });
    expect(response.statusCode).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'caption', from: '2026-10-23', to: '2026-10-23' }));
    const invalid = await app.inject({ url: '/api/shared?from=2026-02-31' });
    expect(invalid.statusCode).toBe(400);
  });
});
