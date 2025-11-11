import prismaPkg from '@prisma/client';

const { PrismaClient } = prismaPkg as typeof import('@prisma/client');

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn']
});

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

export type PrismaTransaction = Parameters<PrismaClientInstance['$transaction']>[0];

export async function withPrisma<T>(handler: (client: PrismaClientInstance) => Promise<T>): Promise<T> {
  return handler(prisma);
}
