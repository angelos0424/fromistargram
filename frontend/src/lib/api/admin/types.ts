export type CrawlAccountStatus = 'ready' | 'error' | 'disabled';

export interface ApiResponse<T> {
  data: T;
}

export interface CrawlAccount {
  id: string;
  username: string;
  status: CrawlAccountStatus;
  lastSessionAt: string | null;
  note?: string | null;
}

export interface CrawlAccountPayload {
  username: string;
  password: string;
  note?: string;
}

export interface CrawlAccountPatch {
  username?: string;
  password?: string | null;
  note?: string | null;
  status?: CrawlAccountStatus;
}

export interface CrawlTarget {
  id: string;
  handle: string;
  displayName: string;
  isActive: boolean;
  isFeatured: boolean;
  priority: number;
  lastSyncedAt: string | null;
  postCount: number;
}

export interface CrawlTargetPayload {
  handle: string;
  displayName: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface CrawlTargetPatch {
  handle?: string;
  displayName?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export type CrawlRunStatus = 'queued' | 'running' | 'success' | 'failure';

export interface CrawlRun {
  id: string;
  targetId: string;
  targetHandle: string;
  triggeredBy: string;
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
  status: CrawlRunStatus;
  message?: string | null;
}

export interface ManualRunPayload {
  targetId?: string;
  sessionId: string;
}

export interface FeedStatistics {
  totalTargets: number;
  activeTargets: number;
  featuredTargets: number;
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
  listTargets(): Promise<CrawlTarget[]>;
  createTarget(payload: CrawlTargetPayload): Promise<CrawlTarget>;
  updateTarget(id: string, patch: CrawlTargetPatch): Promise<CrawlTarget>;
  deleteTarget(id: string): Promise<void>;
  reorderTargets(idsInOrder: string[]): Promise<CrawlTarget[]>;
  listAccounts(): Promise<CrawlAccount[]>;
  createAccount(payload: CrawlAccountPayload): Promise<CrawlAccount>;
  updateAccount(id: string, patch: CrawlAccountPatch): Promise<CrawlAccount>;
  deleteAccount(id: string): Promise<void>;
  registerSession(id: string, sessionId: string): Promise<CrawlAccount>;
  listRuns(): Promise<CrawlRun[]>;
  triggerRun(payload: ManualRunPayload): Promise<CrawlRun>;
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
