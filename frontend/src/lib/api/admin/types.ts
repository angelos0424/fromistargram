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
  targetId: string;
  sessionId: string;
}

export interface FeedStatistics {
  totalTargets: number;
  activeTargets: number;
  featuredTargets: number;
  totalPosts: number;
  lastIndexedAt: string | null;
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
}
