import type { Account, FeedQuery, FeedResponse, MediaItem, Post } from './types';

export interface ApiClient {
  fetchAccounts(): Promise<Account[]>;
  fetchPosts(query: FeedQuery): Promise<FeedResponse>;
  fetchPostById(postId: string): Promise<Post | null>;
}

type AccountSummaryResponse = {
  id: string;
  latestProfilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string | null;
  postCount: number;
};

type MediaItemResponse = {
  id: string;
  orderIndex: number;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  type: MediaItem['type'];
  mediaUrl: string;
  thumbnailUrl: string;
};

type PostSummaryResponse = {
  id: string;
  accountId: string;
  caption: string | null;
  postedAt: string;
  hasText: boolean;
  textContent: string | null;
  media: MediaItemResponse[];
  tags: string[];
};

type ListPostsResponsePayload = {
  data: PostSummaryResponse[];
  total: number;
  pageInfo: FeedResponse['pageInfo'];
};

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const isAbsoluteUrl = (value: string) => /^https?:\/\//iu.test(value);

const normalizeBaseUrl = (value: string) => {
  if (!value) {
    return '/api';
  }

  if (isAbsoluteUrl(value)) {
    return value.replace(/\/+$/u, '');
  }

  const trimmed = `/${value.replace(/^\/+/u, '').replace(/\/+$/u, '')}`;
  return trimmed === '/' ? '/api' : trimmed;
};

const API_BASE_URL = normalizeBaseUrl(DEFAULT_BASE_URL);

const buildPath = (path: string) => {
  const sanitized = path.replace(/^\/+/u, '');
  if (isAbsoluteUrl(API_BASE_URL)) {
    const url = new URL(sanitized, `${API_BASE_URL}/`);
    return url.toString();
  }

  return `${API_BASE_URL}/${sanitized}`;
};

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
};

const toIsoDate = (value: string | undefined, boundary: 'start' | 'end') => {
  if (!value) {
    return undefined;
  }

  const hasTime = value.includes('T');
  const candidate = hasTime
    ? value
    : boundary === 'start'
      ? `${value}T00:00:00.000Z`
      : `${value}T23:59:59.999Z`;

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const mapAccountSummary = (summary: AccountSummaryResponse): Account => ({
  id: summary.id,
  username: summary.id,
  displayName: summary.id,
  latestProfilePicUrl: summary.latestProfilePicUrl,
  createdAt: summary.createdAt,
  updatedAt: summary.updatedAt,
  lastIndexedAt: summary.lastIndexedAt,
  postCount: summary.postCount,
  profilePictures: []
});

const mapMediaItem = (media: MediaItemResponse): MediaItem => ({
  id: media.id,
  orderIndex: media.orderIndex,
  type: media.type,
  filename: media.filename,
  mime: media.mime,
  width: media.width,
  height: media.height,
  duration: media.duration,
  thumbnailUrl: media.thumbnailUrl,
  mediaUrl: media.mediaUrl
});

const mapPostSummary = (post: PostSummaryResponse): Post => ({
  id: post.id,
  accountId: post.accountId,
  caption: post.caption,
  postedAt: post.postedAt,
  hasText: post.hasText,
  textContent: post.textContent,
  media: post.media.map(mapMediaItem),
  tags: post.tags
});

const requestJson = async <T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> => {
  const url = `${buildPath(path)}${params ? toQueryString(params) : ''}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed with ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
};

export const createApiClient = (): ApiClient => ({
  async fetchAccounts() {
    const payload = await requestJson<{ data: AccountSummaryResponse[] }>('/accounts');
    return payload.data.map(mapAccountSummary);
  },
  async fetchPosts(query) {
    const limit = Math.min(Math.max(query.pageSize ?? 12, 1), 60);
    const params: Record<string, string | number | undefined> = {
      accountId: query.accountId,
      from: toIsoDate(query.from, 'start'),
      to: toIsoDate(query.to, 'end'),
      limit,
      page: query.page
    };

    const payload = await requestJson<ListPostsResponsePayload>('/posts', params);
    return {
      posts: payload.data.map(mapPostSummary),
      total: payload.total,
      pageInfo: payload.pageInfo
    };
  },
  async fetchPostById(postId: string) {
    const url = buildPath(`/posts/${postId}`);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Request failed with ${response.status}: ${body || response.statusText}`);
    }

    const payload = (await response.json()) as { data: PostSummaryResponse };
    return mapPostSummary(payload.data);
  }
});
