import Fastify, { FastifyInstance } from 'fastify';
import { createServer, Server } from 'node:http';
import * as jose from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdminAuth } from './auth.js';

let issuer: string;
let server: Server;
let privateKey: CryptoKey;
let app: FastifyInstance;

beforeAll(async () => {
  const pair = await jose.generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const publicJwk = { ...await jose.exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256' };
  server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(request.url?.endsWith('/jwks')
      ? { keys: [publicJwk] }
      : { jwks_uri: `${issuer}jwks` }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  issuer = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/`;
});

afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

beforeEach(async () => {
  vi.stubEnv('AUTHENTIK_ISSUER_URL', issuer);
  vi.stubEnv('AUTHENTIK_AUDIENCE', 'fromistargram-api');
  vi.stubEnv('AUTHENTIK_ADMIN_ROLE', 'admin');
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('ALLOW_INSECURE_LOCAL_ADMIN', '');
  vi.stubEnv('HOST', '0.0.0.0');
  app = Fastify({ logger: false });
  app.get('/admin', { preHandler: requireAdminAuth }, async () => ({ ok: true }));
});

afterEach(async () => { await app.close(); vi.unstubAllEnvs(); });

async function token(roles: string[], audience: string | null = 'fromistargram-api', extra: jose.JWTPayload = {}) {
  let jwt = new jose.SignJWT({ roles, ...extra }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer).setSubject('test-user').setIssuedAt().setExpirationTime('5m');
  if (audience) jwt = jwt.setAudience(audience);
  return jwt.sign(privateKey);
}

async function access(jwt?: string, remoteAddress = '127.0.0.1') {
  return app.inject({ url: '/admin', remoteAddress, headers: jwt ? { authorization: `Bearer ${jwt}` } : {} });
}

describe('administrator authentication', () => {
  it('requires a token and an exact administrator role', async () => {
    expect((await access()).statusCode).toBe(401);
    expect((await access(await token(['viewer']))).statusCode).toBe(403);
    expect((await access(await token(['not-admin']))).statusCode).toBe(403);
    expect((await access(await token(['ADMIN']))).statusCode).toBe(403);
    expect((await access(await token(['admin']))).statusCode).toBe(200);
    expect((await access(await token([], undefined, { groups: ['admin'] }))).statusCode).toBe(200);
  });

  it('rejects incorrect or missing audience claims', async () => {
    expect((await access(await token(['admin'], 'different-api'))).statusCode).toBe(401);
    expect((await access(await token(['admin'], null))).statusCode).toBe(401);
  });

  it('fails closed when issuer or audience configuration is absent', async () => {
    vi.stubEnv('AUTHENTIK_ISSUER_URL', '');
    expect((await access()).statusCode).toBe(503);
    vi.stubEnv('ALLOW_INSECURE_LOCAL_ADMIN', 'true');
    vi.stubEnv('HOST', '127.0.0.1');
    expect((await access()).statusCode).toBe(503);
    vi.stubEnv('AUTHENTIK_ISSUER_URL', issuer);
    vi.stubEnv('AUTHENTIK_AUDIENCE', '');
    expect((await access(await token(['admin']))).statusCode).toBe(503);
  });

  it('allows development bypass only with explicit opt-in, loopback binding and actual loopback peer', async () => {
    vi.stubEnv('AUTHENTIK_ISSUER_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('HOST', '127.0.0.1');
    expect((await access()).statusCode).toBe(503);
    vi.stubEnv('ALLOW_INSECURE_LOCAL_ADMIN', 'true');
    expect((await access()).statusCode).toBe(200);
    expect((await app.inject({ url: '/admin', headers: { 'x-forwarded-for': '192.0.2.10' } })).statusCode).toBe(503);
    expect((await app.inject({ url: '/admin', headers: { origin: 'https://untrusted.example' } })).statusCode).toBe(503);
    expect((await access(undefined, '192.0.2.10')).statusCode).toBe(503);
    vi.stubEnv('HOST', '0.0.0.0');
    expect((await access()).statusCode).toBe(503);
  });
});
