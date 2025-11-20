import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
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

const paramsJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 }
  },
  required: ['id'],
  additionalProperties: false
} as const;

const createBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  note: z.string().max(1000).optional().nullable()
});

const createBodyJsonSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 },
    note: { type: ['string', 'null'], maxLength: 1000 }
  },
  required: ['username', 'password'],
  additionalProperties: false
} as const;

const updateBodySchema = z
  .object({
    username: z.string().min(1).optional(),
    password: z.union([z.string().min(1), z.null()]).optional(),
    note: z.string().max(1000).optional().nullable(),
    status: z.enum(['ready', 'error', 'disabled']).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const updateBodyJsonSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1 },
    password: {
      anyOf: [
        { type: 'string', minLength: 1 },
        { type: 'null' }
      ]
    },
    note: { type: ['string', 'null'], maxLength: 1000 },
    status: { type: 'string', enum: ['ready', 'error', 'disabled'] }
  },
  additionalProperties: false
} as const;

const sessionBodySchema = z.object({
  sessionId: z.string().min(1)
});

const sessionBodyJsonSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', minLength: 1 }
  },
  required: ['sessionId'],
  additionalProperties: false
} as const;

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
    async (request, reply) => {
      try {
        const data = await listCrawlerAccounts();
        return { data };
      } catch (error) {
        request.log.error(error, 'Failed to list crawler accounts');
        return reply.code(500).send({ message: 'Failed to list crawler accounts' });
      }
    }
  );

  app.post(
    '/api/admin/accounts',
    {
      schema: {
        tags: ['AdminAccounts'],
        body: createBodyJsonSchema,
        response: {
          201: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const body = createBodySchema.parse(request.body);
        const data = await createCrawlerAccount(body);
        return reply.code(201).send({ data });
      } catch (error) {
        request.log.error(error, 'Failed to create crawler account');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request body' });
        }
        return reply.code(500).send({ message: 'Failed to create crawler account' });
      }
    }
  );

  app.patch(
    '/api/admin/accounts/:id',
    {
      schema: {
        tags: ['AdminAccounts'],
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
        const updated = await updateCrawlerAccount(params.id, body);
        if (!updated) {
          return reply.code(404).send({ message: 'Crawler account not found' });
        }
        return reply.send({ data: updated });
      } catch (error) {
        request.log.error(error, 'Failed to update crawler account');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request body' });
        }
        return reply.code(500).send({ message: 'Failed to update crawler account' });
      }
    }
  );

  app.delete(
    '/api/admin/accounts/:id',
    {
      schema: {
        tags: ['AdminAccounts'],
        params: paramsJsonSchema,
        response: {
          204: { type: 'null' }
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const deleted = await deleteCrawlerAccount(params.id);
        if (!deleted) {
          return reply.code(404).send({ message: 'Crawler account not found' });
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete crawler account');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request parameters' });
        }
        return reply.code(500).send({ message: 'Failed to delete crawler account' });
      }
    }
  );

  app.post(
    '/api/admin/accounts/:id/session',
    {
      schema: {
        tags: ['AdminAccounts'],
        params: paramsJsonSchema,
        body: sessionBodyJsonSchema,
        response: {
          200: singleResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = sessionBodySchema.parse(request.body);
        const updated = await registerCrawlerSession(params.id, body.sessionId);
        if (!updated) {
          return reply.code(404).send({ message: 'Crawler account not found' });
        }
        return reply.send({ data: updated });
      } catch (error) {
        request.log.error(error, 'Failed to register crawler session');
        if (error instanceof ZodError) {
          return reply.code(400).send({ message: 'Invalid request body' });
        }
        return reply.code(500).send({ message: 'Failed to register crawler session' });
      }
    }
  );
}
