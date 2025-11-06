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
  priority?: number;
}

export interface CrawlAccount {
  id: string;
  username: string;
  status: 'ready' | 'error' | 'disabled';
  lastSessionAt: string | null;
  note?: string;
}

export interface CrawlAccountPayload {
  username: string;
  note?: string;
}

export interface CrawlAccountPatch {
  username?: string;
  note?: string;
  status?: CrawlAccount['status'];
}

export interface CrawlRun {
  id: string;
  targetId: string;
  targetHandle: string;
  triggeredBy: string;
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'queued' | 'running' | 'success' | 'failure';
  message?: string;
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
