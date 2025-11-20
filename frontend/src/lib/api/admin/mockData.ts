import {
  type AdminApiClient,
  type CrawlAccount,
  type CrawlAccountPatch,
  type CrawlAccountPayload,
  type CrawlRun,
  type CrawlTarget,
  type CrawlTargetPatch,
  type CrawlTargetPayload,
  type FeedStatistics,
  type ManualRunPayload
} from './types';

let targets: CrawlTarget[] = [
  {
    id: 'tgt_1',
    handle: 'fromis_9',
    displayName: 'fromis_9',
    isActive: true,
    isFeatured: true,
    priority: 1,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    postCount: 245
  },
  {
    id: 'tgt_2',
    handle: 'saerom',
    displayName: 'Lee Sae-rom',
    isActive: true,
    isFeatured: true,
    priority: 2,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    postCount: 120
  },
  {
    id: 'tgt_3',
    handle: 'jiwon',
    displayName: 'Park Ji-won',
    isActive: false,
    isFeatured: false,
    priority: 3,
    lastSyncedAt: null,
    postCount: 64
  }
];

let accounts: CrawlAccount[] = [
  {
    id: 'acc_1',
    username: 'crawler_main',
    status: 'ready',
    lastSessionAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    note: 'Primary production session'
  },
  {
    id: 'acc_2',
    username: 'crawler_backup',
    status: 'disabled',
    lastSessionAt: null,
    note: 'Use when primary is throttled'
  }
];

let runs: CrawlRun[] = [
  {
    id: 'run_1',
    targetId: 'tgt_1',
    targetHandle: 'fromis_9',
    triggeredBy: 'system',
    sessionId: 'session_main',
    startedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    status: 'success'
  },
  {
    id: 'run_2',
    targetId: 'tgt_2',
    targetHandle: 'saerom',
    triggeredBy: 'admin@fromistargram',
    sessionId: 'session_manual_01',
    startedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    finishedAt: new Date(Date.now() - 1000 * 60 * 170).toISOString(),
    status: 'failure',
    message: 'HTTP 429 rate limited'
  }
];

const delay = async <T>(value: T, ms = 80): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const normalizePriority = () => {
  targets = targets
    .sort((a, b) => a.priority - b.priority)
    .map((target, index) => ({ ...target, priority: index + 1 }));
};

const computeStatistics = (): FeedStatistics => {
  const totalTargets = targets.length;
  const activeTargets = targets.filter((target) => target.isActive).length;
  const featuredTargets = targets.filter((target) => target.isFeatured).length;
  const totalPosts = targets.reduce((acc, target) => acc + target.postCount, 0);
  const lastIndexedAt = targets
    .map((target) => target.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    totalTargets,
    activeTargets,
    featuredTargets,
    totalPosts,
    lastIndexedAt
  };
};

const generateId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const createMockAdminApiClient = (): AdminApiClient => ({
  async listTargets() {
    normalizePriority();
    return delay([...targets]);
  },
  async createTarget(payload) {
    const newTarget: CrawlTarget = {
      id: generateId('tgt'),
      handle: payload.handle,
      displayName: payload.displayName,
      isActive: payload.isActive ?? true,
      isFeatured: payload.isFeatured ?? false,
      priority: targets.length + 1,
      lastSyncedAt: null,
      postCount: 0
    };
    targets = [...targets, newTarget];
    return delay(newTarget);
  },
  async updateTarget(id, patch) {
    targets = targets.map((target) =>
      target.id === id
        ? {
            ...target,
            ...patch
          }
        : target
    );
    normalizePriority();
    const updated = targets.find((target) => target.id === id);
    if (!updated) {
      throw new Error('Target not found');
    }
    return delay(updated);
  },
  async deleteTarget(id) {
    targets = targets.filter((target) => target.id !== id);
    normalizePriority();
    return delay(undefined);
  },
  async reorderTargets(idsInOrder) {
    const map = new Map(targets.map((target) => [target.id, target] as const));
    const ordered: CrawlTarget[] = [];
    idsInOrder.forEach((id, index) => {
      const found = map.get(id);
      if (found) {
        ordered.push({ ...found, priority: index + 1 });
        map.delete(id);
      }
    });

    const remaining = Array.from(map.values()).sort((a, b) => a.priority - b.priority);
    targets = [...ordered, ...remaining].map((target, index) => ({
      ...target,
      priority: index + 1
    }));
    return delay([...targets]);
  },
  async listAccounts() {
    return delay([...accounts]);
  },
  async createAccount(payload: CrawlAccountPayload) {
    const { password: _password, ...rest } = payload;
    const account: CrawlAccount = {
      id: generateId('acc'),
      username: rest.username,
      status: 'ready',
      lastSessionAt: null,
      note: rest.note
    };
    accounts = [...accounts, account];
    return delay(account);
  },
  async updateAccount(id: string, patch: CrawlAccountPatch) {
    const { password: _password, ...restPatch } = patch;
    accounts = accounts.map((account) =>
      account.id === id
        ? {
            ...account,
            ...restPatch
          }
        : account
    );
    const updated = accounts.find((account) => account.id === id);
    if (!updated) {
      throw new Error('Account not found');
    }
    return delay(updated);
  },
  async deleteAccount(id: string) {
    accounts = accounts.filter((account) => account.id !== id);
    return delay(undefined);
  },
  async registerSession(id: string, sessionId: string) {
    const now = new Date().toISOString();
    accounts = accounts.map((account) =>
      account.id === id
        ? {
            ...account,
            lastSessionAt: now,
            status: 'ready',
            note: account.note
          }
        : account
    );

    runs = [
      {
        id: generateId('run'),
        targetId: 'manual',
        targetHandle: 'manual',
        triggeredBy: 'admin',
        sessionId,
        startedAt: now,
        finishedAt: now,
        status: 'success'
      },
      ...runs
    ];

    const updated = accounts.find((account) => account.id === id);
    if (!updated) {
      throw new Error('Account not found');
    }

    return delay(updated);
  },
  async listRuns() {
    return delay([...runs]);
  },
  async triggerRun(payload: ManualRunPayload) {
    const target = targets.find((item) => item.id === payload.targetId);
    if (!target) {
      throw new Error('Target not found');
    }

    const run: CrawlRun = {
      id: generateId('run'),
      targetId: target.id,
      targetHandle: target.handle,
      triggeredBy: 'admin',
      sessionId: payload.sessionId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'queued'
    };

    runs = [run, ...runs];
    return delay(run);
  },
  async fetchFeedStatistics() {
    return delay(computeStatistics());
  }
});
