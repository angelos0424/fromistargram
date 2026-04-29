import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '../db/client.js';
import { resolveUploadedRoot } from '../utils/sourceRoot.js';

const DB_BATCH_SIZE = 500;

export type UploadedReconcilerStatus = 'idle' | 'running' | 'success' | 'failure';

export type UploadedReconcileOptions = {
  dryRun?: boolean;
  cleanOrphanOlderThanDays?: number;
  pruneDeletedDbOlderThanDays?: number;
  recalculateSize?: boolean;
};

export type UploadedReconcileResult = {
  scannedFiles: number;
  dbRowsScanned: number;
  missingFileRows: number;
  orphanFiles: number;
  orphanFilesDeleted: number;
  deletedDbRowsPruned: number;
  sizeRecalculated: number;
};

type UploadedReconcilerState = {
  status: UploadedReconcilerStatus;
  running: boolean;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastError: string | null;
  lastResult: UploadedReconcileResult | null;
};

let currentRun: Promise<void> | null = null;
let lastState: UploadedReconcilerState = {
  status: 'idle',
  running: false,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastError: null,
  lastResult: null
};

async function collectUploadedFiles(root: string): Promise<Map<string, { absolutePath: string; mtimeMs: number }>> {
  const files = new Map<string, { absolutePath: string; mtimeMs: number }>();
  let dayDirs: { isDirectory(): boolean; isFile(): boolean; name: string | Buffer }[] = [];

  try {
    dayDirs = await readdir(root, { withFileTypes: true });
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code === 'ENOENT') {
      return files;
    }
    throw error;
  }

  for (const dayDir of dayDirs) {
    if (!dayDir.isDirectory()) {
      continue;
    }

    const dayDirName = String(dayDir.name);
    const dayDirPath = path.join(root, dayDirName);
    const dayFiles = await readdir(dayDirPath, { withFileTypes: true });

    for (const dayFile of dayFiles) {
      if (!dayFile.isFile()) {
        continue;
      }

      const dayFileName = String(dayFile.name);
      const relativePath = path.posix.join(dayDirName, dayFileName);
      const absolutePath = path.join(dayDirPath, dayFileName);
      const fileStats = await stat(absolutePath);
      files.set(relativePath, { absolutePath, mtimeMs: fileStats.mtimeMs });
    }
  }

  return files;
}

function getUploadRelativePath(uploadedAt: Date, filename: string): string {
  const yyyy = uploadedAt.getUTCFullYear();
  const mm = String(uploadedAt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(uploadedAt.getUTCDate()).padStart(2, '0');
  return path.posix.join(`${yyyy}${mm}${dd}`, filename);
}

async function runUploadedReconcile(options: UploadedReconcileOptions = {}): Promise<UploadedReconcileResult> {
  const uploadedRoot = resolveUploadedRoot();
  const dryRun = options.dryRun ?? false;
  const cleanOrphanOlderThanDays = options.cleanOrphanOlderThanDays ?? 7;
  const pruneDeletedDbOlderThanDays = options.pruneDeletedDbOlderThanDays ?? 30;
  const recalculateSize = options.recalculateSize ?? true;

  const nowMs = Date.now();
  const orphanCutoffMs = nowMs - cleanOrphanOlderThanDays * 24 * 60 * 60 * 1000;
  const deletedDbCutoff = new Date(nowMs - pruneDeletedDbOlderThanDays * 24 * 60 * 60 * 1000);

  const uploadedFiles = await collectUploadedFiles(uploadedRoot);
  const scannedFiles = uploadedFiles.size;

  let dbRowsScanned = 0;
  let missingFileRows = 0;
  let sizeRecalculated = 0;
  let cursorId: string | undefined;

  while (true) {
    const dbRows = await prisma.sharedMedia.findMany({
      select: {
        id: true,
        filename: true,
        uploadedAt: true,
        size: true
      },
      orderBy: { id: 'asc' },
      take: DB_BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
    });

    if (dbRows.length === 0) {
      break;
    }

    dbRowsScanned += dbRows.length;
    cursorId = dbRows[dbRows.length - 1].id;

    for (const row of dbRows) {
      const relativePath = getUploadRelativePath(row.uploadedAt, row.filename);
      const fileInfo = uploadedFiles.get(relativePath);
      if (!fileInfo) {
        missingFileRows += 1;
        continue;
      }

      uploadedFiles.delete(relativePath);

      if (recalculateSize) {
        const fileStats = await stat(fileInfo.absolutePath);
        if (fileStats.size !== row.size && !dryRun) {
          await prisma.sharedMedia.update({ where: { id: row.id }, data: { size: Number(fileStats.size) } });
          sizeRecalculated += 1;
        }
      }
    }
  }

  const orphanCandidates = [...uploadedFiles.entries()];

  let orphanFilesDeleted = 0;
  if (!dryRun) {
    for (const [, file] of orphanCandidates) {
      if (file.mtimeMs >= orphanCutoffMs) {
        continue;
      }

      try {
        await unlink(file.absolutePath);
        orphanFilesDeleted += 1;
      } catch (error) {
        console.warn('Failed to delete orphan uploaded file', { path: file.absolutePath, error });
      }
    }
  }

  let deletedDbRowsPruned = 0;
  if (!dryRun) {
    const result = await prisma.sharedMedia.deleteMany({
      where: {
        isDeleted: true,
        uploadedAt: { lt: deletedDbCutoff }
      }
    });

    deletedDbRowsPruned = result.count;
  }

  return {
    scannedFiles,
    dbRowsScanned,
    missingFileRows,
    orphanFiles: orphanCandidates.length,
    orphanFilesDeleted,
    deletedDbRowsPruned,
    sizeRecalculated
  };
}

function startRun(reason?: string, options: UploadedReconcileOptions = {}): void {
  lastState = {
    ...lastState,
    status: 'running',
    running: true,
    lastStartedAt: new Date(),
    lastFinishedAt: null,
    lastError: null,
    lastResult: null
  };

  currentRun = runUploadedReconcile(options)
    .then((result) => {
      console.info('Uploaded reconciler run succeeded', { reason, ...result });
      lastState = {
        ...lastState,
        status: 'success',
        running: false,
        lastFinishedAt: new Date(),
        lastError: null,
        lastResult: result
      };
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown reconcile error';
      console.error('Uploaded reconciler run failed', { reason, error });
      lastState = {
        ...lastState,
        status: 'failure',
        running: false,
        lastFinishedAt: new Date(),
        lastError: message,
        lastResult: null
      };
    })
    .finally(() => {
      currentRun = null;
    });
}

export function scheduleUploadedReconcile(reason?: string, options: UploadedReconcileOptions = {}): void {
  if (currentRun) {
    return;
  }

  startRun(reason, options);
}

export async function triggerUploadedReconcile(reason?: string, options: UploadedReconcileOptions = {}): Promise<void> {
  if (!currentRun) {
    scheduleUploadedReconcile(reason, options);
  }

  if (currentRun) {
    await currentRun;
  }
}

export function getUploadedReconcilerStatus() {
  return {
    status: currentRun ? 'running' : lastState.status,
    running: Boolean(currentRun),
    lastStartedAt: lastState.lastStartedAt ? lastState.lastStartedAt.toISOString() : null,
    lastFinishedAt: lastState.lastFinishedAt ? lastState.lastFinishedAt.toISOString() : null,
    lastError: lastState.lastError,
    lastResult: lastState.lastResult
  };
}
