import { FastifyInstance } from 'fastify';
import { fetchDatabaseOverview } from '../services/databaseInspectService.js';
import { deleteAccount } from '../services/accountsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const tablePreviewSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    count: { type: 'integer' },
    latestRows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true
      }
    }
  },
  required: ['key', 'label', 'count', 'latestRows'],
  additionalProperties: false
} as const;

const databaseOverviewSchema = {
  type: 'object',
  properties: {
    tables: {
      type: 'array',
      items: tablePreviewSchema
    }
  },
  required: ['tables'],
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

export async function registerAdminDatabaseRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/db-overview',
    {
      schema: {
        tags: ['AdminDatabase'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: databaseOverviewSchema
            },
            required: ['success', 'data'],
            additionalProperties: false
          },
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const data = await fetchDatabaseOverview();
        return sendSuccess(reply, data);
      } catch (error) {
        request.log.error(error, 'Failed to fetch database overview');
        return sendError(reply, 'Failed to load database overview');
      }
    }
  );

  app.delete(
    '/api/admin/db/accounts/:id',
    {
      schema: {
        tags: ['AdminDatabase'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          204: { type: 'null' },
          404: errorResponseSchema,
          500: errorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const deleted = await deleteAccount(id);
        if (!deleted) {
          return sendError(reply, 'Account not found', 404, 'NOT_FOUND');
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete account');
        return sendError(reply, 'Failed to delete account');
      }
    }
  );
}
