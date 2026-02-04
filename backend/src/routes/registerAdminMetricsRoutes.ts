import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { sendSuccess, sendError } from '../utils/response.js';

const statsSchema = {
  type: 'object',
  properties: {
    totalAccounts: { type: 'integer' },
    totalPosts: { type: 'integer' },
    lastIndexedAt: { type: ['string', 'null'], format: 'date-time' }
  },
  required: ['totalAccounts', 'totalPosts', 'lastIndexedAt'],
  additionalProperties: false
} as const;

export async function registerAdminMetricsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/feed-statistics',
    {
      schema: {
        tags: ['AdminMetrics'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: statsSchema
            },
            required: ['success', 'data'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const accountAggregate = await prisma.account.aggregate({
          _count: { _all: true },
          _max: { lastIndexedAt: true }
        });
        const postAggregate = await prisma.post.aggregate({
          _count: { _all: true }
        });

        const data = {
          totalAccounts: accountAggregate._count._all ?? 0,
          totalPosts: postAggregate._count._all ?? 0,
          lastIndexedAt: accountAggregate._max.lastIndexedAt
            ? accountAggregate._max.lastIndexedAt.toISOString()
            : null
        };
        
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to fetch feed statistics');
        return sendError(reply, 'Failed to fetch feed statistics');
      }
    }
  );
}
