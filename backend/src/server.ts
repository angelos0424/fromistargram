import Fastify, { FastifyInstance, FastifyServerOptions, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import { registerApiRoutes } from './routes/index.js';
import { csrfProtection } from './utils/csrf.js';

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

  // CORS configuration
  // Set CORS_ORIGINS env var with comma-separated domains (e.g., "https://example.com,https://app.example.com")
  // If not set, defaults to restrictive mode in production
  const corsOrigins = process.env.CORS_ORIGINS;
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      // If CORS_ORIGINS is configured, check against whitelist
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'), false);
        }
        return;
      }

      // Development fallback: allow localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
        return;
      }

      // No CORS_ORIGINS set and not localhost - deny in production
      callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    credentials: true
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB max (for videos)
    }
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
        { name: 'Media', description: 'Original media streaming endpoints' },
        { name: 'Shared Media', description: 'User-uploaded shared media endpoints' }
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

  // CSRF protection for state-changing requests
  app.addHook('preHandler', csrfProtection);

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
