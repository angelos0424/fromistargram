import { FastifyInstance } from 'fastify';
import { listAccounts } from '../services/accountsService.js';

export async function registerAccountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/accounts', async () => {
    const accounts = await listAccounts();
    return { data: accounts };
  });
}
