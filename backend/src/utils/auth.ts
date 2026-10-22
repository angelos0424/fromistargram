import { FastifyRequest, FastifyReply } from 'fastify';
import * as jose from 'jose';

interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  groups?: string[];
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
}

export interface AuthenticatedUser {
  subject: string;
  email?: string;
  name?: string;
  username?: string;
  roles: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

// Cache for JWKS
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
let jwksUriCache: string | null = null;
let jwksIssuerCache: string | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getIssuerUrl = (): string | null => {
  return process.env.AUTHENTIK_ISSUER_URL?.trim() || null;
};

const getAdminRole = (): string => {
  return process.env.AUTHENTIK_ADMIN_ROLE?.trim() || 'admin';
};

const getAudience = (): string | null => process.env.AUTHENTIK_AUDIENCE?.trim() || null;

const resolveIssuer = (): string | null => {
  const issuerUrl = getIssuerUrl();
  if (!issuerUrl) {
    return null;
  }
  return issuerUrl.endsWith('/') ? issuerUrl : `${issuerUrl}/`;
};

async function fetchJwksUri(issuerUrl: string): Promise<string> {
  const discoveryUrl = new URL('.well-known/openid-configuration', issuerUrl);
  const res = await fetch(discoveryUrl, {
    headers: { accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch OIDC discovery: ${res.status} ${res.statusText}`);
  }
  const payload = await res.json();
  if (!payload?.jwks_uri || typeof payload.jwks_uri !== 'string') {
    throw new Error('OIDC discovery response missing jwks_uri');
  }
  return payload.jwks_uri;
}

async function getJwks(): Promise<jose.JWTVerifyGetKey> {
  const issuerUrl = resolveIssuer();
  if (!issuerUrl) {
    throw new Error('AUTHENTIK_ISSUER_URL environment variable is not set');
  }

  if (jwksIssuerCache !== issuerUrl) {
    jwksCache = null;
    jwksUriCache = null;
    jwksIssuerCache = issuerUrl;
  }

  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL_MS) {
    return jwksCache;
  }

  if (!jwksUriCache) {
    jwksUriCache = await fetchJwksUri(issuerUrl);
  }

  jwksCache = jose.createRemoteJWKSet(new URL(jwksUriCache));
  jwksCacheTime = now;

  return jwksCache;
}

export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  const issuerUrl = resolveIssuer();

  const audience = getAudience();
  if (!issuerUrl || !audience) return null;

  try {
    const jwks = await getJwks();
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: issuerUrl,
      audience,
      requiredClaims: ['sub', 'exp'],
    });

    const jwtPayload = payload as JwtPayload;

    if (typeof jwtPayload.sub !== 'string' || !jwtPayload.sub) {
      return null;
    }

    // Extract roles from both 'roles' and 'groups' claims (Authentik may use either)
    const roles: string[] = [];
    if (Array.isArray(jwtPayload.roles)) {
      roles.push(...jwtPayload.roles.filter((r): r is string => typeof r === 'string'));
    }
    if (Array.isArray(jwtPayload.groups)) {
      roles.push(...jwtPayload.groups.filter((g): g is string => typeof g === 'string'));
    }

    return {
      subject: jwtPayload.sub,
      email: jwtPayload.email,
      name: jwtPayload.name,
      username: jwtPayload.preferred_username,
      roles: [...new Set(roles)], // dedupe
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      console.warn('JWT token expired');
    } else if (error instanceof jose.errors.JWTInvalid) {
      console.warn('Invalid JWT token');
    } else {
      console.warn('Token verification failed:', error instanceof Error ? error.message : 'Unknown verification error');
    }
    return null;
  }
}

export function hasAdminRole(user: AuthenticatedUser): boolean {
  const adminRole = getAdminRole();
  return user.roles.includes(adminRole);
}

/**
 * Fastify preHandler hook for admin authentication
 * Requires valid JWT token with admin role
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const issuerUrl = getIssuerUrl();

  if (!issuerUrl || !getAudience()) {
    const loopbackHosts = ['127.0.0.1', '::1', 'localhost'];
    const loopbackPeers = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const isLoopbackUrl = (value: string) => {
      try { return ['127.0.0.1', '[::1]', 'localhost'].includes(new URL(value).hostname); }
      catch { return false; }
    };
    const forwarded = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']
      .some((name) => request.headers[name] !== undefined);
    const localBypass = !issuerUrl && process.env.NODE_ENV === 'development'
      && process.env.ALLOW_INSECURE_LOCAL_ADMIN === 'true'
      && loopbackHosts.includes(process.env.HOST ?? '')
      && loopbackPeers.includes(request.raw.socket.remoteAddress ?? '')
      && !forwarded
      && isLoopbackUrl(`http://${request.headers.host ?? ''}`)
      && (!request.headers.origin || isLoopbackUrl(request.headers.origin));
    if (localBypass) {
      request.log.warn('Explicit local development admin bypass enabled');
      request.user = { subject: 'local-development', roles: [getAdminRole()] };
      return;
    }
    request.log.error('Admin authentication requires issuer and audience configuration');
    reply.code(503).send({ error: 'Admin authentication is not configured' });
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    reply.code(401).send({ error: 'Authorization header required' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    reply.code(401).send({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  const user = await verifyToken(token);
  if (!user) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }

  if (!hasAdminRole(user)) {
    reply.code(403).send({ error: 'Administrator role required' });
    return;
  }

  request.user = user;
}

/**
 * Optional auth - extracts user if token present, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return;
  }

  const user = await verifyToken(token);
  if (user) {
    request.user = user;
  }
}
