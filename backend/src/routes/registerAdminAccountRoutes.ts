import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createCrawlerAccount,
  deleteCrawlerAccount,
  listCrawlerAccounts,
  registerCrawlerSession,
  updateCrawlerAccount
} from '../services/accountsService.js';

const accountSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    status: { type: 'string', enum: ['ready', 'error', 'disabled'] },
    note: { type: ['string', 'null'] },
    lastSessionAt: { type: ['string', 'null'], format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'username', 'status', 'createdAt', 'updatedAt'],
  additionalProperties: false
} as const;

const listResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: accountSchema
    }
  },
  required: ['data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    data: accountSchema
  },
  required: ['data'],
  additionalProperties: false
} as const;

const paramsSchema = z.object({
  id: z.string().min(1)
});

const createBodySchema = z.object({
  username: z.string().min(1),
  note: z.string().max(1000).optional().nullable()
});

const updateBodySchema = z
  .object({
    username: z.string().min(1).optional(),
    note: z.string().max(1000).optional().nullable(),
    status: z.enum(['ready', 'error', 'disabled']).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const sessionBodySchema = z.object({
  sessionId: z.string().min(1)
});

export async function registerAdminAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/accounts',
    {
      schema: {
        tags: ['AdminAccounts'],
        response: {
          200: listResponseSchema
        }
      }
    },
    async () => {
      const data = await listCrawlerAccounts();
      return { data };
    }
  );

  app.post(
    '/api/admin/accounts',
    {
      schema: {
        tags: ['AdminAccounts'],
        body: createBodySchema,
        response: {
          201: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      const body = createBodySchema.parse(request.body);
      const data = await createCrawlerAccount(body);
      return reply.code(201).send({ data });
    }
  );

  app.patch(
    '/api/admin/accounts/:id',
    {
      schema: {
        tags: ['AdminAccounts'],
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
      const updated = await updateCrawlerAccount(params.id, body);
      if (!updated) {
        return reply.code(404).send({ message: 'Crawler account not found' });
      }
      return reply.send({ data: updated });
    }
  );

  app.delete(
    '/api/admin/accounts/:id',
    {
      schema: {
        tags: ['AdminAccounts'],
        params: paramsSchema,
        response: {
          204: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const deleted = await deleteCrawlerAccount(params.id);
      if (!deleted) {
        return reply.code(404).send({ message: 'Crawler account not found' });
      }
      return reply.code(204).send();
    }
  );

  app.post(
    '/api/admin/accounts/:id/session',
    {
      schema: {
        tags: ['AdminAccounts'],
        params: paramsSchema,
        body: sessionBodySchema,
        response: {
          200: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const body = sessionBodySchema.parse(request.body);
      const updated = await registerCrawlerSession(params.id, body.sessionId);
      if (!updated) {
        return reply.code(404).send({ message: 'Crawler account not found' });
      }
      return reply.send({ data: updated });
    }
  );
}
