import Fastify, { FastifyBaseLogger, FastifyInstance, FastifyServerOptions, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pino from 'pino';
import { registerApiRoutes } from './routes/index.js';
import { csrfProtection } from './utils/csrf.js';
import { getAllowedOrigins, isOriginAllowed } from './utils/origin.js';

export type BuildServerOptions = Omit<FastifyServerOptions, 'logger'> & {
  logger?: FastifyServerOptions['logger'] | FastifyBaseLogger;
  enablePrettyLogs?: boolean;
};

function isLoggerInstance(logger: BuildServerOptions['logger']): logger is FastifyBaseLogger {
  return typeof logger === 'object' && logger !== null
    && ['info', 'error', 'debug', 'fatal', 'warn', 'trace', 'child']
      .every((method) => typeof (logger as unknown as Record<string, unknown>)[method] === 'function');
}

function resolveLoggingOptions({ logger, loggerInstance, enablePrettyLogs }: BuildServerOptions):
  Pick<FastifyServerOptions, 'logger' | 'loggerInstance'> {
  if (isLoggerInstance(logger)) {
    if (loggerInstance) throw new TypeError('Specify a logger instance using only one option');
    return { loggerInstance: logger };
  }
  if (loggerInstance) return { logger, loggerInstance };
  if (logger !== undefined) return { logger };

  return {
    loggerInstance: pino({
      level: process.env.LOG_LEVEL ?? 'info',
      transport: enablePrettyLogs
        ? {
          target: 'pino-pretty',
          options: { translateTime: 'SYS:standard' }
        }
        : undefined
    })
  };
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const { logger, loggerInstance, enablePrettyLogs, ...serverOptions } = options;
  const loggingOptions = resolveLoggingOptions({ logger, loggerInstance, enablePrettyLogs });

  const app = Fastify({
    disableRequestLogging: true,
    ...serverOptions,
    ...loggingOptions
  });

  // CORS configuration
  // Set CORS_ORIGINS env var with comma-separated domains (e.g., "https://example.com,https://*.example.com")
  // If not set, defaults to restrictive mode in production
  const allowedOrigins = getAllowedOrigins();

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    credentials: true
  });

  await app.register(multipart, {
    limits: {
      fileSize: 200 * 1024 * 1024 // 200MB max (for videos)
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
      : reply.elapsedTime;

    const routePath = request.routeOptions.url ?? request.url;

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
