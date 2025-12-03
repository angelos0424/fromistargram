import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPostById, listPosts } from '../services/postsService.js';
import { ListPostsResponseSchema, PostSummarySchema } from './schemas.js';

const listQuerySchema = z.object({
  accountId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(60).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).optional()
});

export async function registerPostRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/posts',
    {
      schema: {
        tags: ['Posts'],
        summary: 'List posts with optional filters',
        querystring: {
          type: 'object',
          properties: {
            accountId: { type: 'string' },
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 60 },
            from: { type: 'string' },
            to: { type: 'string' },
            page: { type: 'integer', minimum: 1 },
            type: { type: 'string' }
          },
          additionalProperties: false
        },
        response: {
          200: ListPostsResponseSchema
        }
      }
    },
    async (request) => {
      const { accountId, cursor, limit, from, to, page, type } = listQuerySchema.extend({ type: z.string().optional() }).parse(request.query);

      return await listPosts({
        accountId,
        cursor,
        limit: limit ?? 20,
        postedAtFrom: from,
        postedAtTo: to,
        page,
        type
      });
    }
  );

  app.get(
    '/api/posts/:id',
    {
      schema: {
        tags: ['Posts'],
        summary: 'Fetch a single post by ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id'],
          additionalProperties: false
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: PostSummarySchema
            },
            required: ['data'],
            additionalProperties: false
          },
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const params = z.object({ id: z.string() }).parse(request.params);
      const post = await getPostById(params.id);

      if (!post) {
        return reply.code(404).send({ message: 'Post not found' });
      }

      return { data: post };
    }
  );
}
