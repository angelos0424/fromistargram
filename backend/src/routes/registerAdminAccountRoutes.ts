import { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import {
  createCrawlerAccount,
  deleteCrawlerAccount,
  listCrawlerAccounts,
  registerCrawlerSession,
  updateCrawlerAccount
} from '../services/accountsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

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
    success: { type: 'boolean', const: true },
    data: {
      type: 'array',
      items: accountSchema
    }
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const singleResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: accountSchema
  },
  required: ['success', 'data'],
  additionalProperties: false
} as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {}
      },
      required: ['code', 'message']
    }
  },
  required: ['success', 'error'],
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

// Password policy: minimum 8 characters, at least one uppercase, one lowercase, one number
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const createBodySchema = z.object({
  username: z.string().min(1),
  password: passwordSchema,
  note: z.string().max(1000).optional().nullable()
});

const createBodyJsonSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1 },
    password: {
      type: 'string',
      minLength: 8,
      description: 'Minimum 8 characters with at least one uppercase, one lowercase, and one number'
    },
    note: { type: ['string', 'null'], maxLength: 1000 }
  },
  required: ['username', 'password'],
  additionalProperties: false
} as const;

const updateBodySchema = z
  .object({
    username: z.string().min(1).optional(),
    password: z.union([passwordSchema, z.null()]).optional(),
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
        {
          type: 'string',
          minLength: 8,
          description: 'Minimum 8 characters with at least one uppercase, one lowercase, and one number'
        },
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
          200: listResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const data = await listCrawlerAccounts();
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to list crawler accounts');
        return sendError(reply, 'Failed to list crawler accounts');
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
          201: singleResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const body = createBodySchema.parse(request.body);
        const data = await createCrawlerAccount(body);
        return sendSuccess(reply, data, 201);
      } catch (error) {
        request.log.error(error, 'Failed to create crawler account');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to create crawler account');
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
          200: singleResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = updateBodySchema.parse(request.body);
        const updated = await updateCrawlerAccount(params.id, body);
        if (!updated) {
          return sendError(reply, 'Crawler account not found', 404, 'NOT_FOUND');
        }
        return sendSuccess(reply, updated);
      } catch (error) {
        request.log.error(error, 'Failed to update crawler account');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to update crawler account');
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
          204: { type: 'null' },
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const deleted = await deleteCrawlerAccount(params.id);
        if (!deleted) {
          return sendError(reply, 'Crawler account not found', 404, 'NOT_FOUND');
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete crawler account');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request parameters', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to delete crawler account');
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
          200: singleResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const params = paramsSchema.parse(request.params);
        const body = sessionBodySchema.parse(request.body);
        const updated = await registerCrawlerSession(params.id, body.sessionId);
        if (!updated) {
          return sendError(reply, 'Crawler account not found', 404, 'NOT_FOUND');
        }
        return sendSuccess(reply, updated);
      } catch (error) {
        request.log.error(error, 'Failed to register crawler session');
        if (error instanceof ZodError) {
          return sendError(reply, 'Invalid request body', 400, 'BAD_REQUEST', error.issues);
        }
        return sendError(reply, 'Failed to register crawler session');
      }
    }
  );
}
