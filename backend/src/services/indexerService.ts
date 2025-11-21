import { indexFileSystem } from '../indexer/indexer.js';

type IndexerStatus = 'idle' | 'running' | 'success' | 'failure';

type IndexerState = {
  status: IndexerStatus;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
};

let currentRun: Promise<void> | null = null;
let rerunRequested = false;
let lastState: IndexerState = {
  status: 'idle',
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null
};

function runIndexer(reason?: string): void {
  lastState = {
    ...lastState,
    status: 'running',
    lastStartedAt: new Date(),
    lastError: null
  };

  currentRun = indexFileSystem()
    .then(() => {
      lastState = {
        ...lastState,
        status: 'success',
        lastFinishedAt: new Date(),
        lastError: null
      };
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown indexing error';
      console.error('Indexer run failed', { reason, error });
      lastState = {
        ...lastState,
        status: 'failure',
        lastFinishedAt: new Date(),
        lastError: message
      };
    })
    .finally(() => {
      currentRun = null;
      if (rerunRequested) {
        rerunRequested = false;
        runIndexer('rerun-requested');
      }
    });
}

export function scheduleIndexerRun(reason?: string): void {
  if (currentRun) {
    rerunRequested = true;
    return;
  }
  rerunRequested = false;
  runIndexer(reason);
}

export async function triggerIndexerRun(reason?: string): Promise<void> {
  if (!currentRun) {
    scheduleIndexerRun(reason);
  }
  if (currentRun) {
    await currentRun;
  }
}

export type IndexerStatusPayload = {
  status: IndexerStatus;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  running: boolean;
};

export function getIndexerStatus(): IndexerStatusPayload {
  return {
    status: currentRun ? 'running' : lastState.status,
    lastStartedAt: lastState.lastStartedAt ? lastState.lastStartedAt.toISOString() : null,
    lastFinishedAt: lastState.lastFinishedAt ? lastState.lastFinishedAt.toISOString() : null,
    lastError: lastState.lastError,
    running: Boolean(currentRun)
  };
}
