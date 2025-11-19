import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createCrawlTarget,
  deleteCrawlTarget,
  listCrawlTargets,
  reorderCrawlTargets,
  updateCrawlTarget
} from '../services/crawlTargetsService.js';

const targetSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    handle: { type: 'string' },
    displayName: { type: 'string' },
    isActive: { type: 'boolean' },
    isFeatured: { type: 'boolean' },
    priority: { type: 'integer' },
    lastSyncedAt: { type: ['string', 'null'], format: 'date-time' },
    postCount: { type: 'integer' }
  },
  required: [
    'id',
    'handle',
    'displayName',
    'isActive',
    'isFeatured',
    'priority',
    'postCount'
  ],
  additionalProperties: false
} as const;

const listResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: targetSchema
    }
  },
  required: ['data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    data: targetSchema
  },
  required: ['data'],
  additionalProperties: false
} as const;

const createBodySchema = z.object({
  handle: z.string().min(1),
  displayName: z.string().min(1),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional()
});

const updateBodySchema = z
  .object({
    displayName: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const paramsSchema = z.object({
  id: z.string().min(1)
});

const reorderBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export async function registerAdminTargetRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/targets',
    {
      schema: {
        tags: ['AdminTargets'],
        response: {
          200: listResponseSchema
        }
      }
    },
    async () => {
      const data = await listCrawlTargets();
      return { data };
    }
  );

  app.post(
    '/api/admin/targets',
    {
      schema: {
        tags: ['AdminTargets'],
        body: createBodySchema,
        response: {
          201: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      const body = createBodySchema.parse(request.body);
      try {
        const data = await createCrawlTarget(body);
        return reply.code(201).send({ data });
      } catch (error) {
        request.log.error(error, 'Failed to create crawl target');
        return reply.code(400).send({ message: 'Failed to create crawl target' });
      }
    }
  );

  app.patch(
    '/api/admin/targets/:id',
    {
      schema: {
        tags: ['AdminTargets'],
        params: paramsSchema,
        body: updateBodySchema,
        response: {
          200: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const body = updateBodySchema.parse(request.body);
      const updated = await updateCrawlTarget(params.id, body);
      if (!updated) {
        return reply.code(404).send({ message: 'Crawl target not found' });
      }
      return reply.send({ data: updated });
    }
  );

  app.delete(
    '/api/admin/targets/:id',
    {
      schema: {
        tags: ['AdminTargets'],
        params: paramsSchema,
        response: {
          204: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const deleted = await deleteCrawlTarget(params.id);
      if (!deleted) {
        return reply.code(404).send({ message: 'Crawl target not found' });
      }
      return reply.code(204).send();
    }
  );

  app.post(
    '/api/admin/targets/reorder',
    {
      schema: {
        tags: ['AdminTargets'],
        body: reorderBodySchema,
        response: {
          200: listResponseSchema
        }
      }
    },
    async (request) => {
      const body = reorderBodySchema.parse(request.body);
      const data = await reorderCrawlTargets(body.ids);
      return { data };
    }
  );
}
