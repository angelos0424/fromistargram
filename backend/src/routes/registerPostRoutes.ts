import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPostById, listPosts } from '../services/postsService.js';
import { ListPostsResponseSchema, PostSummarySchema } from './schemas.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { isValidDateFilter } from '../utils/dateRange.js';

const listQuerySchema = z.object({
  accountId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(60).optional(),
  from: z.string().refine(isValidDateFilter, 'Use YYYY-MM-DD (Asia/Seoul) or an ISO datetime with timezone').optional(),
  to: z.string().refine(isValidDateFilter, 'Use YYYY-MM-DD (Asia/Seoul) or an ISO datetime with timezone').optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().min(1).optional(),
  sort: z.enum(['newest', 'oldest']).optional()
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
            from: { type: 'string', description: 'Inclusive KST date (YYYY-MM-DD), or an ISO datetime with timezone' },
            to: { type: 'string', description: 'Inclusive KST date (YYYY-MM-DD), or an inclusive ISO datetime with timezone' },
            search: { type: 'string', maxLength: 200 },
            page: { type: 'integer', minimum: 1 },
            type: { type: 'string' },
            sort: { type: 'string', enum: ['newest', 'oldest'] }
          },
          additionalProperties: false
        },
        response: {
          200: ListPostsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const parsed = listQuerySchema.extend({ type: z.string().optional() }).safeParse(request.query);
      if (!parsed.success) {
        return sendError(reply, 'Invalid post filters: use KST dates or ISO datetimes with timezone', 400, 'BAD_REQUEST');
      }
      const { accountId, cursor, limit, from, to, page, type, sort, search } = parsed.data;

      const result = await listPosts({
        accountId,
        cursor,
        limit: limit ?? 20,
        postedAtFrom: from,
        postedAtTo: to,
        page,
        type,
        sort,
        search
      });

      return sendSuccess(reply, result.data, 200, {
        total: result.total,
        pageInfo: result.pageInfo
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
              success: { type: 'boolean', const: true },
              data: PostSummarySchema
            },
            required: ['success', 'data'],
            additionalProperties: false
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' }
                },
                required: ['code', 'message']
              }
            },
            required: ['success', 'error'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const params = z.object({ id: z.string() }).parse(request.params);
      const post = await getPostById(params.id);

      if (!post) {
        return sendError(reply, 'Post not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(reply, post);
    }
  );
}
