import { FastifyInstance } from 'fastify';
import { registerAccountRoutes } from './registerAccountRoutes.js';
import { registerPostRoutes } from './registerPostRoutes.js';
import { registerMediaRoutes } from './registerMediaRoutes.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  await app.register(registerAccountRoutes);
  await app.register(registerPostRoutes);
  await app.register(registerMediaRoutes);
}
