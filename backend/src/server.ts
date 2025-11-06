import Fastify, { FastifyInstance, FastifyServerOptions, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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

  const publicApiUrl = process.env.PUBLIC_API_BASE_URL;
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Fromistargram API',
        description: 'REST API for browsing indexed Instagram content',
        version: '1.0.0'
      },
      servers: publicApiUrl
        ? [
            {
              url: publicApiUrl
            }
          ]
        : undefined,
      tags: [
        { name: 'Accounts', description: 'Account summaries and profile metadata' },
        { name: 'Posts', description: 'Feed browsing and post detail endpoints' },
        { name: 'Media', description: 'Original media streaming endpoints' }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true
  });

  app.addHook('onRequest', (request, _reply, done) => {
    (request as FastifyRequest & { metricsStart?: bigint }).metricsStart = process.hrtime.bigint();
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const metricsStart = (request as FastifyRequest & { metricsStart?: bigint }).metricsStart;
    const durationMs = metricsStart
      ? Number(process.hrtime.bigint() - metricsStart) / 1_000_000
      : reply.getResponseTime();

    const routePath = request.routerPath ?? request.url;

    request.log.info(
      {
        route: routePath,
        method: request.method,
        statusCode: reply.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      },
      'request completed'
    );

    done();
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
