import { FastifyInstance } from 'fastify';
import { fetchDatabaseOverview } from '../services/databaseInspectService.js';
import { deleteAccount } from '../services/accountsService.js';

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
              data: databaseOverviewSchema
            },
            required: ['data'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const data = await fetchDatabaseOverview();
        return { data };
      } catch (error) {
        request.log.error(error, 'Failed to fetch database overview');
        return reply.code(500).send({ message: 'Failed to load database overview' });
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
          404: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const deleted = await deleteAccount(id);
        if (!deleted) {
          return reply.code(404).send({ message: 'Account not found' });
        }
        return reply.code(204).send();
      } catch (error) {
        request.log.error(error, 'Failed to delete account');
        return reply.code(500).send({ message: 'Failed to delete account' });
      }
    }
  );
}
