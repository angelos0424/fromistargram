import { FastifyInstance } from 'fastify';
import { listAccounts } from '../services/accountsService.js';
import { AccountSummarySchema } from './schemas.js';

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
                items: AccountSummarySchema
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
}
