import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';
import { registerApiRoutes } from './routes/index.js';

export type BuildServerOptions = FastifyServerOptions & {
  enablePrettyLogs?: boolean;
};

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const logger = options.logger ??
    pino({
      level: process.env.LOG_LEVEL ?? 'info',
      transport: options.enablePrettyLogs
        ? {
            target: 'pino-pretty',
            options: { translateTime: 'SYS:standard' }
          }
        : undefined
    });

  const app = Fastify({
    logger,
    disableRequestLogging: true,
    ...options
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'HEAD', 'OPTIONS']
  });

  await registerApiRoutes(app);

  app.get('/healthz', async () => ({ status: 'ok' }));

  return app;
}

async function start() {
  const app = await buildServer({ enablePrettyLogs: process.env.NODE_ENV !== 'production' });
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
