import { FastifyInstance } from 'fastify';
import { registerAccountRoutes } from './registerAccountRoutes.js';
import { registerPostRoutes } from './registerPostRoutes.js';
import { registerMediaRoutes } from './registerMediaRoutes.js';
import { registerAdminAccountRoutes } from './registerAdminAccountRoutes.js';
import { registerAdminTargetRoutes } from './registerAdminTargetRoutes.js';
import { registerAdminRunRoutes } from './registerAdminRunRoutes.js';
import { registerAdminMetricsRoutes } from './registerAdminMetricsRoutes.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  await app.register(registerAccountRoutes);
  await app.register(registerPostRoutes);
  await app.register(registerMediaRoutes);
  await app.register(registerAdminAccountRoutes);
  await app.register(registerAdminTargetRoutes);
  await app.register(registerAdminRunRoutes);
  await app.register(registerAdminMetricsRoutes);

  // Redirect /api/docs → /docs so Swagger UI is reachable behind /api-only proxies.
  app.get('/api/docs', async (_request, reply) => reply.redirect('/docs'));
}
