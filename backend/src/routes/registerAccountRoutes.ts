import { FastifyInstance } from 'fastify';
import { listAccounts, getAccount } from '../services/accountsService.js';
import { AccountSummarySchema, AccountSchema } from './schemas.js';

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
              data: {
                type: 'array',
                items: AccountSchema
              }
            },
            required: ['data'],
            additionalProperties: false
          }
        }
      }
    },
    async () => {
      const accounts = await listAccounts();
      return { data: accounts };
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
              data: AccountSchema
            },
            required: ['data'],
            additionalProperties: false
          },
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
      const account = await getAccount(id);

      if (!account) {
        return reply.status(404).send({ message: 'Account not found' });
      }

      return { data: account };
    }
  );
}
