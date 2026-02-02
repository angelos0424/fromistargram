import { FastifyInstance } from 'fastify';
import { listAccounts, getAccount } from '../services/accountsService.js';
import { AccountSchema } from './schemas.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function registerAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/accounts',
    {
      schema: {
        tags: ['Accounts'],
        summary: 'List available Instagram accounts',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'array',
                items: AccountSchema
              }
            },
            required: ['success', 'data'],
            additionalProperties: false
          }
        }
      }
    },
    async (request, reply) => {
      const accounts = await listAccounts();
      return sendSuccess(reply, accounts);
    }
  );

  app.get(
    '/api/accounts/:id',
    {
      schema: {
        tags: ['Accounts'],
        summary: 'Get account details',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', const: true },
              data: AccountSchema
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
      const { id } = request.params as { id: string };
      const account = await getAccount(id);

      if (!account) {
        return sendError(reply, 'Account not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(reply, account);
    }
  );
}
