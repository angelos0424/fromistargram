import { FastifyInstance } from 'fastify';
import { registerAccountRoutes } from './registerAccountRoutes.js';
import { registerPostRoutes } from './registerPostRoutes.js';
import { registerMediaRoutes } from './registerMediaRoutes.js';
import { registerAdminMetricsRoutes } from './registerAdminMetricsRoutes.js';
import { registerAdminIndexerRoutes } from './registerAdminIndexerRoutes.js';
import { registerAdminDatabaseRoutes } from './registerAdminDatabaseRoutes.js';
import { registerAdminSharedMediaRoutes } from './registerAdminSharedMediaRoutes.js';
import { registerAdminManualUploadRoutes } from './registerAdminManualUploadRoutes.js';
import { registerHighlightRoutes } from './highlights.js';
import { registerImageProxyRoutes } from './imageProxy.js';
import { registerSharedMediaRoutes } from './registerSharedMediaRoutes.js';
import { requireAdminAuth } from '../utils/auth.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  // Public routes
  await app.register(registerAccountRoutes);
  await app.register(registerPostRoutes);
  await app.register(registerMediaRoutes);
  await app.register(registerSharedMediaRoutes);
  await app.register(registerHighlightRoutes);
  await app.register(registerImageProxyRoutes);

  // Admin routes - protected with authentication
  await app.register(async (adminApp) => {
    // Apply admin auth to all routes in this scope
    adminApp.addHook('preHandler', requireAdminAuth);

    await adminApp.register(registerAdminMetricsRoutes);
    await adminApp.register(registerAdminIndexerRoutes);
    await adminApp.register(registerAdminDatabaseRoutes);
    await adminApp.register(registerAdminSharedMediaRoutes);
    await adminApp.register(registerAdminManualUploadRoutes);
  });

  // Redirect /api/docs → /docs so Swagger UI is reachable behind /api-only proxies.
  app.get('/api/docs', async (_request, reply) => reply.redirect('/docs'));
}
