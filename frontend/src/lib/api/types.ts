export interface ProfilePicture {
  id: string;
  accountId: string;
  takenAt: string;
  url: string;
}

export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  orderIndex: number;
  type: MediaType;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string;
  mediaUrl: string;
}

export interface Post {
  id: string;
  accountId: string;
  postedAt: string;
  caption: string | null;
  hasText: boolean;
  textContent: string | null;
  media: MediaItem[];
  tags: string[];
}

export interface Account {
  id: string;
  username: string;
  displayName: string;
  latestProfilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string | null;
  postCount: number;
  profilePictures: ProfilePicture[];
}

export interface FeedQuery {
  accountId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface FeedResponse {
  posts: Post[];
  total: number;
  pageInfo: PageInfo;
}
