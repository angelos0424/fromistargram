import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { test } from 'node:test';
import Fastify from 'fastify';
import { sendFileWithRange } from './range.js';

async function createTempFile(content: Buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), 'range-test-'));
  const filePath = path.join(dir, 'sample.bin');
  await writeFile(filePath, content);
  return filePath;
}

test('serves full file when no range header provided', async (t) => {
  const filePath = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
  const app = Fastify();
  app.get('/media', async (_, reply) => sendFileWithRange(reply, { filePath }));

  const response = await app.inject({ method: 'GET', url: '/media' });
  await app.close();

  t.equal(response.statusCode, 200);
  t.equal(response.body, 'abcdefghij');
  t.equal(response.headers['accept-ranges'], 'bytes');
  t.equal(response.headers['content-length'], '10');
});

test('serves partial content when range header provided', async (t) => {
  const filePath = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
  const app = Fastify();
  app.get('/media', async (request, reply) =>
    sendFileWithRange(reply, { filePath, rangeHeader: request.headers.range as string })
  );

  const response = await app.inject({
    method: 'GET',
    url: '/media',
    headers: { range: 'bytes=2-5' }
  });
  await app.close();

  t.equal(response.statusCode, 206);
  t.equal(response.body, 'cdef');
  t.equal(response.headers['content-range'], 'bytes 2-5/10');
});

test('returns 416 for invalid ranges', async (t) => {
  const filePath = await createTempFile(Buffer.from('abcdefghij', 'utf-8'));
  const app = Fastify();
  app.get('/media', async (request, reply) =>
    sendFileWithRange(reply, { filePath, rangeHeader: request.headers.range as string })
  );

  const response = await app.inject({
    method: 'GET',
    url: '/media',
    headers: { range: 'bytes=999-20' }
  });
  await app.close();

  t.equal(response.statusCode, 416);
});
