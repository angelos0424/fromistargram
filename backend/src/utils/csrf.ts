import { FastifyRequest, FastifyReply } from 'fastify';
import { getAllowedOrigins, isOriginAllowed } from './origin.js';

/**
 * CSRF Protection middleware
 *
 * For Bearer token authentication, CSRF attacks are limited because:
 * 1. Authorization headers are not automatically sent by browsers
 * 2. JavaScript is required to add the header
 *
 * However, we add Origin/Referer validation as defense in depth.
 */

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Validate Origin header for state-changing requests
 * This provides CSRF protection as defense in depth
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Only check state-changing methods
  if (!STATE_CHANGING_METHODS.includes(request.method)) {
    return;
  }

  // Skip for requests with no origin (server-to-server, curl, etc.)
  // These must have Authorization header which provides CSRF protection
  const origin = request.headers.origin;
  const referer = request.headers.referer;

  // If neither origin nor referer is present, the request might be from:
  // - Server-to-server (no browser)
  // - Same-origin (some browsers omit for same-origin)
  // In these cases, rely on Bearer token authentication for protection
  if (!origin && !referer) {
    // If no Authorization header either, this is suspicious
    if (!request.headers.authorization) {
      request.log.warn('State-changing request without origin/referer/auth');
    }
    return;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check origin header first
  if (origin) {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      request.log.warn({ origin }, 'CSRF: Origin not allowed');
      reply.code(403).send({ error: 'Origin not allowed' });
      return;
    }
    return;
  }

  // Fall back to referer if no origin
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!isOriginAllowed(refererOrigin, allowedOrigins)) {
        request.log.warn({ referer }, 'CSRF: Referer origin not allowed');
        reply.code(403).send({ error: 'Origin not allowed' });
        return;
      }
    } catch {
      request.log.warn({ referer }, 'CSRF: Invalid referer URL');
      reply.code(403).send({ error: 'Invalid referer' });
      return;
    }
  }
}
