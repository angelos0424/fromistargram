import { FastifyInstance } from 'fastify';
import { getIndexerStatus, scheduleIndexerRun, triggerIndexerRun } from '../services/indexerService.js';

const indexerStatusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['idle', 'running', 'success', 'failure'] },
    lastStartedAt: { type: ['string', 'null'], format: 'date-time' },
    lastFinishedAt: { type: ['string', 'null'], format: 'date-time' },
    lastError: { type: ['string', 'null'] },
    running: { type: 'boolean' }
  },
  required: ['status', 'lastStartedAt', 'lastFinishedAt', 'lastError', 'running'],
  additionalProperties: false
} as const;

const statusResponseSchema = {
  type: 'object',
  properties: {
    data: indexerStatusSchema
  },
  required: ['data'],
  additionalProperties: false
} as const;

export async function registerAdminIndexerRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/indexer',
    {
      schema: {
        tags: ['AdminIndexer'],
        response: {
          200: statusResponseSchema
        }
      }
    },
    async () => {
      return { data: getIndexerStatus() };
    }
  );

  app.post(
    '/api/admin/indexer/run',
    {
      schema: {
        tags: ['AdminIndexer'],
        response: {
          202: statusResponseSchema
        }
      }
    },
    async (_request, reply) => {
      scheduleIndexerRun('manual-trigger');
      if (process.env.NODE_ENV === 'test') {
        await triggerIndexerRun('manual-trigger');
      }
      return reply.code(202).send({ data: getIndexerStatus() });
    }
  );
}
