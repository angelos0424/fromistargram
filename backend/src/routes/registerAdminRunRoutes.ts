import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { listCrawlRuns, triggerManualRun } from '../services/crawlTargetsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const runSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    targetId: { type: 'string' },
    targetHandle: { type: 'string' },
    triggeredBy: { type: 'string' },
    sessionId: { type: 'string' },
    status: { type: 'string', enum: ['queued', 'running', 'success', 'failure'] },
    startedAt: { type: 'string', format: 'date-time' },
    finishedAt: { type: ['string', 'null'], format: 'date-time' },
    message: { type: ['string', 'null'] }
  },
  required: ['id', 'targetId', 'targetHandle', 'triggeredBy', 'sessionId', 'status', 'startedAt'],
  additionalProperties: false
} as const;

const runsResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'array',
      items: runSchema
    }
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: runSchema
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const triggerBodySchema = z.object({
  sessionId: z.string().min(1),
  targetId: z.string().min(1).optional()
});

const triggerBodyJsonSchema = {
  type: 'object',
  properties: {
    targetId: { type: 'string', minLength: 1 },
    sessionId: { type: 'string', minLength: 1 }
  },
  required: ['sessionId'],
  additionalProperties: false
} as const;

export async function registerAdminRunRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/runs',
    {
      schema: {
        tags: ['AdminRuns'],
        response: {
          200: runsResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const data = await listCrawlRuns();
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to fetch crawl runs');
        return sendError(reply, 'Failed to fetch crawl runs');
      }
    }
  );

  app.post(
    '/api/admin/runs',
    {
      schema: {
        tags: ['AdminRuns'],
        body: triggerBodyJsonSchema,
        response: {
          201: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const body = triggerBodySchema.parse(request.body);
        const run = await triggerManualRun({ ...body, triggeredBy: 'admin:manual' });
        if (!run) {
          return sendError(reply, 'Crawl target not found', 404, 'NOT_FOUND');
        }
        return sendSuccess(reply, run, 201);
      } catch (error) {
        request.log.error(error, 'Failed to trigger manual crawl run');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to trigger manual crawl run');
      }
    }
  );
}
