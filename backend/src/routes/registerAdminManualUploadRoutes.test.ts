import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { multipartPayload, MultipartTestPart, PNG } from '../testUtils/multipart.js';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../db/client.js', () => ({ prisma: { account: { findUnique: mocks.findUnique } } }));
import { registerAdminManualUploadRoutes } from './registerAdminManualUploadRoutes.js';

let app: FastifyInstance;
let root: string;
let source: string;
const base = '2026-10-23_03-00-00_UTC';
const file: MultipartTestPart = { name: 'files', filename: 'photo.png', contentType: 'image/png', data: PNG };

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'fromistargram-manual-security-'));
  source = path.join(root, 'source');
  await mkdir(source);
  vi.stubEnv('CRAWL_OUTPUT_DIR', source);
  vi.stubEnv('UPLOAD_MAX_CONCURRENT', '2');
  mocks.findUnique.mockReset().mockResolvedValue({ id: 'test_user' });
  app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(registerAdminManualUploadRoutes);
});
afterEach(async () => { await app.close(); await rm(root, { recursive: true, force: true }); vi.unstubAllEnvs(); });

function upload(accountId = 'test_user', files: MultipartTestPart[] = [file]) {
  const body = multipartPayload([
    { name: 'accountId', value: accountId },
    { name: 'postedAt', value: '2026-10-23T03:00:00Z' },
    { name: 'type', value: 'Post' },
    { name: 'caption', value: 'new caption' },
    ...files
  ]);
  return app.inject({ method: 'POST', url: '/api/admin/manual-upload', headers: { 'content-type': body.contentType }, payload: body.body });
}

describe('manual source uploads', () => {
  it('saves new files and rejects retries without changing media, captions or metadata', async () => {
    expect((await upload()).statusCode).toBe(200);
    const directory = path.join(source, 'test_user');
    const names = await readdir(directory);
    const original = await Promise.all(names.map((name) => readFile(path.join(directory, name))));
    const retry = await upload();
    expect(retry.statusCode).toBe(409);
    expect(await readdir(directory)).toEqual(names);
    expect(await Promise.all(names.map((name) => readFile(path.join(directory, name))))).toEqual(original);
  });

  it('rejects timestamp collisions even if the extension or number of files changes', async () => {
    const directory = path.join(source, 'test_user');
    await mkdir(directory);
    await writeFile(path.join(directory, `${base}.jpg`), 'existing original');
    expect((await upload('test_user', [file, file])).statusCode).toBe(409);
    expect(await readdir(directory)).toEqual([`${base}.jpg`]);
    expect(await readFile(path.join(directory, `${base}.jpg`), 'utf8')).toBe('existing original');
  });

  it('admits only one simultaneous administrator upload', async () => {
    const responses = await Promise.all([upload(), upload()]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 429]);
    expect((await readdir(path.join(source, 'test_user'))).sort()).toEqual([`${base}.json`, `${base}.png`, `${base}.txt`]);
  });

  it.each(['../escape', '/tmp/escape', 'nested/account', 'nested\\account', '..'])('rejects path-shaped account IDs: %s', async (accountId) => {
    expect((await upload(accountId)).statusCode).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(await readdir(source)).toEqual([]);
  });

  it('requires an existing account', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    expect((await upload('missing')).statusCode).toBe(404);
    expect(await readdir(source)).toEqual([]);
  });

  it('preserves registered account IDs containing hyphens or more than 30 characters', async () => {
    const accountId = `existing-account-${'x'.repeat(40)}`;
    mocks.findUnique.mockResolvedValueOnce({ id: accountId });
    const response = await upload(accountId);
    expect(response.statusCode).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: accountId }, select: { id: true } });
    expect(await readFile(path.join(source, accountId, `${base}.png`))).toEqual(PNG);
  });

  it('rejects account directories whose symlink resolves outside the source root', async () => {
    const outside = path.join(root, 'outside');
    await mkdir(outside);
    await symlink(outside, path.join(source, 'test_user'));
    expect((await upload()).statusCode).toBe(400);
    expect(await readdir(outside)).toEqual([]);
  });

  it('validates the whole batch before writing any original files', async () => {
    const response = await upload('test_user', [file, { name: 'files', filename: 'fake.jpg', contentType: 'image/jpeg', data: Buffer.from('<html>fake</html>') }]);
    expect(response.statusCode).toBe(400);
    expect(await readdir(source)).toEqual([]);
  });
});
