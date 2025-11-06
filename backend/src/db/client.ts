import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn']
});

export type PrismaTransaction = Parameters<PrismaClient['$transaction']>[0];

export async function withPrisma<T>(handler: (client: PrismaClient) => Promise<T>): Promise<T> {
  return handler(prisma);
}
