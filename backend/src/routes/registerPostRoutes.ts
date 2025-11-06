import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPostById, listPosts } from '../services/postsService.js';

const listQuerySchema = z.object({
  accountId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().min(1).max(60))
    .optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export async function registerPostRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/posts', async (request) => {
    const { accountId, cursor, limit, from, to } = listQuerySchema.parse(request.query);

    const response = await listPosts({
      accountId,
      cursor,
      limit: limit ?? 20,
      postedAtFrom: from,
      postedAtTo: to
    });

    return response;
  });

  app.get('/api/posts/:id', async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const post = await getPostById(params.id);

    if (!post) {
      return reply.code(404).send({ message: 'Post not found' });
    }

    return { data: post };
  });
}
