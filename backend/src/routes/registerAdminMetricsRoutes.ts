import { FastifyInstance } from 'fastify';
import { fetchFeedStatistics } from '../services/crawlTargetsService.js';

const statsSchema = {
  type: 'object',
  properties: {
    totalTargets: { type: 'integer' },
    activeTargets: { type: 'integer' },
    featuredTargets: { type: 'integer' },
    totalPosts: { type: 'integer' },
    lastIndexedAt: { type: ['string', 'null'], format: 'date-time' }
  },
  required: ['totalTargets', 'activeTargets', 'featuredTargets', 'totalPosts', 'lastIndexedAt'],
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
              data: statsSchema
            },
            required: ['data'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const data = await fetchFeedStatistics();
        return { data };
      } catch (error) {
        request.log.error(error, 'Failed to fetch feed statistics');
        return reply.code(500).send({ message: 'Failed to fetch feed statistics' });
      }
    }
  );
}
