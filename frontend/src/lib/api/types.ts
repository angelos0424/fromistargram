export type MediaType = 'image' | 'video';

export interface AccountProfilePicture {
  id: string;
  url: string;
  takenAt: string;
}

export interface AccountSummary {
  id: string;
  latestProfilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string | null;
  postCount: number;
}

/**
 * Public account data returned from the backend. Some UI fields (username,
 * displayName, profilePictures) are optional because the public API currently
 * exposes only summary metadata.
 */
export interface Account extends AccountSummary {
  username?: string;
  displayName?: string;
  profilePictures?: AccountProfilePicture[];
}

export interface AccountsResponse {
  data: Account[];
}

export interface AccountResponse {
  data: Account;
}

export interface MediaItem {
  id: string;
  orderIndex: number;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  type: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
}

export interface Post {
  id: string;
  accountId: string;
  caption: string | null;
  postedAt: string;
  hasText: boolean;
  textContent: string | null;
  media: MediaItem[];
  tags: string[];
  type: string;
}

export interface PostsRequest {
  accountId?: string;
  cursor?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  type?: string;
}

export interface PostsResponse {
  data: Post[];
  total: number;
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
}

export interface PostResponse {
  data: Post;
}

export interface FeedQuery {
  accountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

interface FeedStatistics {
  totalTargets: number;
  activeTargets: number;
  featuredTargets: number;
  totalPosts: number;
  lastIndexedAt: string | null;
}
export interface FeedResponse {
  data: FeedStatistics
}

export interface HighlightMedia {
  id: string;
  filename: string;
  mime: string;
  orderIndex: number;
  url: string;
  thumbnailUrl: string;
}

export interface Highlight {
  id: string;
  title: string;
  coverUrl: string;
  coverMedia?: HighlightMedia | null
  media: HighlightMedia[];
}