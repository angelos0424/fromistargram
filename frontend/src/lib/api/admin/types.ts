export interface ApiResponse<T> {
  data: T;
}

export interface FeedStatistics {
  totalAccounts: number;
  totalPosts: number;
  lastIndexedAt: string | null;
}

export type IndexerRunStatus = 'idle' | 'running' | 'success' | 'failure';

export interface IndexerStatus {
  status: IndexerRunStatus;
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
}

export interface TablePreview {
  key: string;
  label: string;
  count: number;
  latestRows: Record<string, unknown>[];
}

export interface DatabaseOverview {
  tables: TablePreview[];
}

export interface AdminApiClient {
  fetchFeedStatistics(): Promise<FeedStatistics>;
  fetchIndexerStatus(): Promise<IndexerStatus>;
  runIndexer(): Promise<IndexerStatus>;
}

export interface AdminSharedMedia {
  id: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  mediaUrl: string;
  thumbnailUrl: string | null;
  accountName: string | null;
  caption: string | null;
  uploadBatchId: string | null;
  isDeleted: boolean;
  uploadedAt: string;
}

export interface AdminSharedMediaListResponse {
  data: AdminSharedMedia[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface AdminSharedMediaPatch {
  caption: string | null;
}
