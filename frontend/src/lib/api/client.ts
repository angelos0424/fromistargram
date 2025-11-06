import { mockAccounts, mockPosts } from './mockData';
import type { Account, FeedQuery, FeedResponse, Post } from './types';

export interface ApiClient {
  fetchAccounts(): Promise<Account[]>;
  fetchPosts(query: FeedQuery): Promise<FeedResponse>;
  fetchPostById(postId: string): Promise<Post | undefined>;
}

const simulateLatency = async <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const normalizeDate = (value?: string) =>
  value ? new Date(value).toISOString() : undefined;

const isInRange = (postedAt: string, from?: string, to?: string) => {
  const timestamp = new Date(postedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (from) {
    const fromTime = new Date(from).getTime();
    if (timestamp < fromTime) {
      return false;
    }
  }

  if (to) {
    const toTime = new Date(to).getTime();
    if (timestamp > toTime) {
      return false;
    }
  }

  return true;
};

export const createMockApiClient = (): ApiClient => ({
  async fetchAccounts() {
    return simulateLatency(mockAccounts);
  },
  async fetchPosts(query) {
    const {
      accountId,
      from,
      to,
      page = 1,
      pageSize = 12
    } = query;

    const normalizedFrom = normalizeDate(from);
    const normalizedTo = normalizeDate(to);

    const filtered = mockPosts
      .filter((post) =>
        accountId ? post.accountId === accountId : true
      )
      .filter((post) => isInRange(post.postedAt, normalizedFrom, normalizedTo))
      .sort(
        (a, b) =>
          new Date(b.postedAt).getTime() -
          new Date(a.postedAt).getTime()
      );

    const start = Math.max(0, (page - 1) * pageSize);
    const end = start + pageSize;

    const posts = filtered.slice(start, end);

    return simulateLatency({
      posts,
      total: filtered.length
    } satisfies FeedResponse);
  },
  async fetchPostById(postId) {
    const post = mockPosts.find((item) => item.id === postId);
    return simulateLatency(post);
  }
});
