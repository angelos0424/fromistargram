export type MediaType = 'image' | 'video';

export interface ApiResponse<T, M = undefined> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T, M = undefined> = ApiResponse<T, M> | ApiError;

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

export type AccountsResponse = ApiResponse<Account[]>;

export type AccountResponse = ApiResponse<Account>;

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
  sort?: 'newest' | 'oldest';
}

export type PostsResponse = ApiResponse<
  Post[],
  {
    total: number;
    pageInfo: {
      hasNextPage: boolean;
      nextCursor: string | null;
    };
  }
>;

export type PostResponse = ApiResponse<Post>;

export interface FeedQuery {
  accountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

interface FeedStatistics {
  totalAccounts: number;
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

export interface SharedMedia {
  id: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
 width?: number | null;
 height?: number | null;
 duration?: number | null;
	accountName?: string | null;
	caption?: string | null;
	uploadBatchId?: string | null;
	uploadedAt: string;
	mediaUrl: string;
	thumbnailUrl?: string;

}

export interface SharedMediaListRequest {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
}

export type SharedMediaListResponse = ApiResponse<
  SharedMedia[],
  {
    hasMore: boolean;
    nextCursor: string | null;
    total: number;
  }
>;

export type SharedMediaUploadResponse = ApiResponse<SharedMedia[]>;

export type SharedMediaResponse = ApiResponse<SharedMedia>;
