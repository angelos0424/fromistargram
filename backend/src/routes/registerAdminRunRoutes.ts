import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listCrawlRuns, triggerManualRun } from '../services/crawlTargetsService.js';

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
    data: {
      type: 'array',
      items: runSchema
    }
  },
  required: ['data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    data: runSchema
  },
  required: ['data'],
  additionalProperties: false
} as const;

const triggerBodySchema = z.object({
  targetId: z.string().min(1),
  sessionId: z.string().min(1)
});

const triggerBodyJsonSchema = {
  type: 'object',
  properties: {
    targetId: { type: 'string', minLength: 1 },
    sessionId: { type: 'string', minLength: 1 }
  },
  required: ['targetId', 'sessionId'],
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
    async () => {
      const data = await listCrawlRuns();
      return { data };
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
      const body = triggerBodySchema.parse(request.body);
      const run = await triggerManualRun({ ...body, triggeredBy: 'admin:manual' });
      if (!run) {
        return reply.code(404).send({ message: 'Crawl target not found' });
      }
      return reply.code(201).send({ data: run });
    }
  );
}
