import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import {
  createCrawlTarget,
  deleteCrawlTarget,
  listCrawlTargets,
  reorderCrawlTargets,
  updateCrawlTarget
} from '../services/crawlTargetsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

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
    success: { type: 'boolean', const: true },
    data: {
      type: 'array',
      items: targetSchema
    }
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: targetSchema
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const createBodySchema = z.object({
  handle: z.string().min(1),
  displayName: z.string().min(1),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional()
});

const createBodyJsonSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    isActive: { type: 'boolean' },
    isFeatured: { type: 'boolean' }
  },
  required: ['handle', 'displayName'],
  additionalProperties: false
} as const;

const updateBodySchema = z
  .object({
    handle: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const updateBodyJsonSchema = {
  type: 'object',
  properties: {
    handle: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    isActive: { type: 'boolean' },
    isFeatured: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

const paramsSchema = z.object({
  id: z.string().min(1)
});

const paramsJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 }
  },
  required: ['id'],
  additionalProperties: false
} as const;

const reorderBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

const reorderBodyJsonSchema = {
  type: 'object',
  properties: {
    ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1
    }
  },
  required: ['ids'],
  additionalProperties: false
} as const;

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
    async (request, reply) => {
      try {
        const data = await listCrawlTargets();
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to list crawl targets');
        return sendError(reply, 'Failed to list crawl targets');
      }
    }
  );

  app.post(
    '/api/admin/targets',
    {
      schema: {
        tags: ['AdminTargets'],
        body: createBodyJsonSchema,
        response: {
          201: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const body = createBodySchema.parse(request.body);
        const data = await createCrawlTarget(body);
        return sendSuccess(reply, data, 201);
      } catch (error) {
        request.log.error(error, 'Failed to create crawl target');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to create crawl target');
      }
    }
  );

  app.patch(
    '/api/admin/targets/:id',
    {
      schema: {
        tags: ['AdminTargets'],
        params: paramsJsonSchema,
        body: updateBodyJsonSchema,
        response: {
          200: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = updateBodySchema.parse(request.body);
        const updated = await updateCrawlTarget(params.id, body);
        if (!updated) {
          return sendError(reply, 'Crawl target not found', 404, 'NOT_FOUND');
        }
        return sendSuccess(reply, updated);
      } catch (error) {
        request.log.error(error, 'Failed to update crawl target');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to update crawl target');
      }
    }
  );

  app.delete(
    '/api/admin/targets/:id',
    {
      schema: {
        tags: ['AdminTargets'],
        params: paramsJsonSchema,
        response: {
          204: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const deleted = await deleteCrawlTarget(params.id);
        if (!deleted) {
          return sendError(reply, 'Crawl target not found', 404, 'NOT_FOUND');
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete crawl target');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request parameters', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to delete crawl target');
      }
    }
  );

  app.post(
    '/api/admin/targets/reorder',
    {
      schema: {
        tags: ['AdminTargets'],
        body: reorderBodyJsonSchema,
        response: {
          200: listResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const body = reorderBodySchema.parse(request.body);
        const data = await reorderCrawlTargets(body.ids);
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to reorder crawl targets');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to reorder crawl targets');
      }
    }
  );
}
