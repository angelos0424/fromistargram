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
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getIssuerUrl = (): string | null => {
  return process.env.AUTHENTIK_ISSUER_URL || null;
};

const getAdminRole = (): string => {
  return process.env.AUTHENTIK_ADMIN_ROLE || 'admin';
};

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

  // If no issuer URL is configured, skip verification (for development)
  if (!issuerUrl) {
    console.warn('AUTHENTIK_ISSUER_URL not configured - auth verification disabled');
    return null;
  }

  try {
    const jwks = await getJwks();
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: issuerUrl,
    });

    const jwtPayload = payload as JwtPayload;

    if (!jwtPayload.sub) {
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
      console.error('Token verification failed:', error);
    }
    return null;
  }
}

export function hasAdminRole(user: AuthenticatedUser): boolean {
  const adminRole = getAdminRole();
  return user.roles.some(
    (role) =>
      role === adminRole ||
      role.toLowerCase() === adminRole.toLowerCase() ||
      role.includes(adminRole)
  );
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

  // If AUTHENTIK_ISSUER_URL is not set, skip auth (for local development)
  // In production, this should always be set
  if (!issuerUrl) {
    request.log.warn('Admin auth skipped - AUTHENTIK_ISSUER_URL not configured');
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
    request.log.warn({ user: user.username, roles: user.roles }, 'Access denied - missing admin role');
    reply.code(403).send({ error: 'Admin role required' });
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
