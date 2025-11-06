import { prisma } from '../db/client.js';

export type AccountSummary = {
  id: string;
  latestProfilePicUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  postCount: number;
};

export async function listAccounts(): Promise<AccountSummary[]> {
  const accounts = await prisma.account.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { posts: true } } }
  });

  return accounts.map((account) => ({
    id: account.id,
    latestProfilePicUrl: account.latestProfilePicUrl,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    postCount: account._count.posts
  }));
}
