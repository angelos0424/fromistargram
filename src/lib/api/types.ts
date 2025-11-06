export interface ProfilePicture {
  id: string;
  accountId: string;
  takenAt: string;
  url: string;
}

export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  postId: string;
  order: number;
  type: MediaType;
  filename: string;
  mime: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl: string;
  mediaUrl: string;
}

export interface Post {
  id: string;
  accountId: string;
  postedAt: string;
  caption: string;
  hashtags: string[];
  media: MediaItem[];
}

export interface Account {
  id: string;
  username: string;
  displayName: string;
  latestProfilePicUrl: string;
  profilePictures: ProfilePicture[];
}

export interface FeedQuery {
  accountId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface FeedResponse {
  posts: Post[];
  total: number;
}
