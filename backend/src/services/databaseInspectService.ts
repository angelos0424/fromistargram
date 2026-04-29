import { withPrisma } from '../db/client.js';

export interface TablePreview {
  key: string;
  label: string;
  count: number;
  latestRows: Record<string, unknown>[];
}

export interface DatabaseOverview {
  tables: TablePreview[];
}

export async function fetchDatabaseOverview(): Promise<DatabaseOverview> {
  return withPrisma(async (client) => {
    const [
      accounts,
      accountCount,
      posts,
      postCount,
      tags,
      tagCount,
      highlights,
      highlightCount
    ] = await Promise.all([
      client.account.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          lastIndexedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { posts: true, highlights: true } }
        }
      }),
      client.account.count(),
      client.post.findMany({
        orderBy: { postedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          accountId: true,
          postedAt: true,
          type: true,
          hasText: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { media: true, tags: true } }
        }
      }),
      client.post.count(),
      client.tag.findMany({
        orderBy: { id: 'desc' },
        take: 5,
        select: { id: true, name: true }
      }),
      client.tag.count(),
      client.highlight.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          accountId: true,
          title: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      client.highlight.count()
    ]);

    const tables: TablePreview[] = [
      { key: 'accounts', label: '계정', count: accountCount, latestRows: accounts },
      { key: 'posts', label: '게시물', count: postCount, latestRows: posts },
      { key: 'tags', label: '태그', count: tagCount, latestRows: tags },
      { key: 'highlights', label: '하이라이트', count: highlightCount, latestRows: highlights }
    ];

    return { tables };
  });
}
