import type { CrawlRun, CrawlRunStatus, CrawlTarget as PrismaCrawlTarget } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { prisma } from '../db/client.js';
import { scheduleIndexerRun } from './indexerService.js';
import { InstagramScraper } from '@aduptive/instagram-scraper';
import {InstagramPost} from "@aduptive/instagram-scraper/dist/types.js";

export type AdminCrawlTarget = {
  id: string;
  handle: string;
  displayName: string;
  isActive: boolean;
  isFeatured: boolean;
  priority: number;
  lastSyncedAt: string | null;
  postCount: number;
};

export type CreateCrawlTargetInput = {
  handle: string;
  displayName: string;
  isActive?: boolean;
  isFeatured?: boolean;
};

export type UpdateCrawlTargetInput = {
  handle?: string;
  displayName?: string;
  isActive?: boolean;
  isFeatured?: boolean;
};

export type ManualRunInput = {
  targetId?: string;
  sessionId: string;
  triggeredBy?: string;
};

export type AdminCrawlRun = {
  id: string;
  targetId: string;
  targetHandle: string;
  triggeredBy: string;
  sessionId: string;
  status: CrawlRunStatus;
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
};

const mapTarget = (target: PrismaCrawlTarget, postCount: number): AdminCrawlTarget => ({
  id: target.id,
  handle: target.handle,
  displayName: target.displayName,
  isActive: target.isActive,
  isFeatured: target.isFeatured,
  priority: target.priority,
  lastSyncedAt: target.lastSyncedAt ? target.lastSyncedAt.toISOString() : null,
  postCount
});

async function fetchPostCounts(handles: string[]): Promise<Map<string, number>> {
  if (!handles.length) {
    return new Map();
  }

  const groups = (await prisma.post.groupBy({
    by: ['accountId'],
    _count: { _all: true },
    where: {
      accountId: { in: handles }
    }
  })) as Array<{ accountId: string; _count: { _all: number } }>;

  return new Map(groups.map((group) => [group.accountId, group._count._all]));
}

async function ensureAccountExists(handle: string): Promise<void> {
  await prisma.account.upsert({
    where: { id: handle },
    update: {},
    create: { id: handle }
  });
}

type LoginCredentials = {
  id: string;
  username: string;
  password: string;
};

async function findReadyCrawlerAccount(): Promise<LoginCredentials | null> {
  const [account] = await prisma.crawlAccount.findMany({
    where: {
      status: 'ready',
      password: { not: null }
    },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: {
      id: true,
      username: true,
      password: true
    }
  });

  if (!account || !account.password) {
    return null;
  }

  return {
    id: account.id,
    username: account.username,
    password: account.password
  };
}

export async function listCrawlTargets(): Promise<AdminCrawlTarget[]> {
  const targets = (await prisma.crawlTarget.findMany({
    orderBy: { priority: 'asc' }
  })) as PrismaCrawlTarget[];

  const postCounts = await fetchPostCounts(targets.map((target) => target.handle));
  return targets.map((target) => mapTarget(target, postCounts.get(target.handle) ?? 0));
}

export async function createCrawlTarget(payload: CreateCrawlTargetInput): Promise<AdminCrawlTarget> {
  await ensureAccountExists(payload.handle);
  const aggregate = (await prisma.crawlTarget.aggregate({
    _max: { priority: true }
  })) as { _max: { priority: number | null } };

  const nextPriority = (aggregate._max.priority ?? 0) + 1;

  const target = (await prisma.crawlTarget.create({
    data: {
      handle: payload.handle,
      displayName: payload.displayName,
      isActive: payload.isActive ?? true,
      isFeatured: payload.isFeatured ?? false,
      priority: nextPriority
    }
  })) as PrismaCrawlTarget;

  return mapTarget(target, 0);
}

export async function updateCrawlTarget(
  id: string,
  patch: UpdateCrawlTargetInput
): Promise<AdminCrawlTarget | null> {
  const existing = await prisma.crawlTarget.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const nextHandle = patch.handle?.trim();
  if (nextHandle && nextHandle !== existing.handle) {
    await ensureAccountExists(nextHandle);
  }

  const target = (await prisma.crawlTarget.update({
    where: { id },
    data: {
      handle: nextHandle ?? existing.handle,
      displayName: patch.displayName ?? existing.displayName,
      isActive: patch.isActive ?? existing.isActive,
      isFeatured: patch.isFeatured ?? existing.isFeatured
    }
  })) as PrismaCrawlTarget;

  const counts = await fetchPostCounts([target.handle]);
  return mapTarget(target, counts.get(target.handle) ?? 0);
}

export async function deleteCrawlTarget(id: string): Promise<boolean> {
  const existing = await prisma.crawlTarget.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  await prisma.crawlTarget.delete({ where: { id } });
  return true;
}

export async function reorderCrawlTargets(idsInOrder: string[]): Promise<AdminCrawlTarget[]> {
  const targets = (await prisma.crawlTarget.findMany({ orderBy: { priority: 'asc' } })) as PrismaCrawlTarget[];
  const targetMap = new Map(targets.map((target) => [target.id, target] as const));

  let priority = 1;
  const queue: { id: string; priority: number }[] = [];

  idsInOrder.forEach((id) => {
    const target = targetMap.get(id);
    if (!target) {
      return;
    }
    queue.push({ id: target.id, priority });
    targetMap.delete(id);
    priority += 1;
  });

  Array.from(targetMap.values())
    .sort((a, b) => a.priority - b.priority)
    .forEach((target) => {
      queue.push({ id: target.id, priority });
      priority += 1;
    });

  if (queue.length) {
    await prisma.$transaction(
      queue.map(({ id, priority: nextPriority }) =>
        prisma.crawlTarget.update({ where: { id }, data: { priority: nextPriority } })
      )
    );
  }

  return listCrawlTargets();
}

const mapRun = (run: CrawlRun & { target: { handle: string } }): AdminCrawlRun => ({
  id: run.id,
  targetId: run.targetId,
  targetHandle: run.target.handle,
  triggeredBy: run.triggeredBy,
  sessionId: run.sessionId,
  status: run.status,
  startedAt: run.startedAt.toISOString(),
  finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
  message: run.message
});

export async function listCrawlRuns(limit = 50): Promise<AdminCrawlRun[]> {
  const runs = (await prisma.crawlRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: { target: { select: { handle: true } } }
  })) as Array<CrawlRun & { target: { handle: string } }>;

  return runs.map((run) => mapRun(run));
}

export async function triggerManualRun(payload: ManualRunInput): Promise<AdminCrawlRun | null> {
  const targets = (await prisma.crawlTarget.findMany({
    where: payload.targetId ? { id: payload.targetId, isActive: true } : { isActive: true }
  })) as PrismaCrawlTarget[];

  const handles = targets.map((target) => target.handle);

  if (!handles.length) {
    return null;
  }

  const target = targets[0];
  const loginAccount = await findReadyCrawlerAccount();

  const run = (await prisma.crawlRun.create({
    data: {
      targetId: target.id,
      sessionId: payload.sessionId,
      status: 'queued',
      triggeredBy: payload.triggeredBy ?? 'admin:manual',
      sessionAccountId: loginAccount?.id ?? null,
      message: null,
      finishedAt: null
    },
    include: { target: { select: { handle: true } } }
  })) as CrawlRun & { target: { handle: string } };

  launchManualCrawler(run.id, handles, payload.sessionId, loginAccount ?? undefined);

  return mapRun(run);
}

export type FeedStatistics = {
  totalTargets: number;
  activeTargets: number;
  featuredTargets: number;
  totalPosts: number;
  lastIndexedAt: string | null;
};

export async function fetchFeedStatistics(): Promise<FeedStatistics> {
  const [targetCounts, postAggregate] = await Promise.all([
    prisma.crawlTarget.groupBy({
      by: ['isActive', 'isFeatured'],
      _count: { _all: true }
    }) as Promise<Array<{ isActive: boolean; isFeatured: boolean; _count: { _all: number } }>>,
    prisma.post.aggregate({
      _count: { _all: true }
    }) as Promise<{ _count: { _all: number | null } }>
  ]);

  const totals = (await prisma.crawlTarget.aggregate({
    _count: { _all: true },
    _max: { lastSyncedAt: true }
  })) as { _count: { _all: number | null }; _max: { lastSyncedAt: Date | null } };

  const activeTargets = targetCounts
    .filter((group) => group.isActive)
    .reduce((acc, group) => acc + group._count._all, 0);

  const featuredTargets = targetCounts
    .filter((group) => group.isFeatured)
    .reduce((acc, group) => acc + group._count._all, 0);

  return {
    totalTargets: totals._count._all ?? 0,
    activeTargets,
    featuredTargets,
    totalPosts: postAggregate._count._all ?? 0,
    lastIndexedAt: totals._max.lastSyncedAt ? totals._max.lastSyncedAt.toISOString() : null
  };
}

const resolveCrawlerScriptPath = (): string => {
  if (process.env.CRAWL_SCRIPT_PATH) {
    return process.env.CRAWL_SCRIPT_PATH;
  }

  const baseDir = process.cwd();
  return path.join(baseDir, 'src', 'utils', 'crawl.py');
};

const pythonExecutable = () => process.env.PYTHON_EXECUTABLE ?? 'python3';

async function updateRunStatus(
  runId: string,
  status: CrawlRunStatus,
  message?: string | null
): Promise<void> {
  await prisma.crawlRun.update({
    where: { id: runId },
    data: {
      status,
      message: message ?? null,
      finishedAt: status === 'running' ? null : new Date()
    }
  });
}

async function scrapeMultipleProfiles(usernames: string[]) {
  const scraper = new InstagramScraper({
    maxRetries: 3,
    minDelay: 2000,
    maxDelay: 5000,
    timeout: 10000,
    rateLimitPerMinute: 20
  });

  const result: { name : string, posts: InstagramPost[]}[] = [];

  for (const username of usernames) {
    try {
      await new Promise(resolve =>
        setTimeout(resolve, 2000 + Math.random() * 3000)
      );

      const results = await scraper.getPosts(username, 20);

      if (results.success) {
        console.log(`${username}: ${results.posts?.length} posts collected`);
        if (results.posts) {
          result.push({name: username, posts: results.posts});
          console.log('result.posts[0] ::' + JSON.stringify(result[0].posts[0]))
        }
      } else {
        console.log(`${username}: ${results.error}`);
      }
    } catch (error) {
      console.error(`Error collecting ${username}:`, error);
    }
  }
  return result;
}

function launchManualCrawler(
  runId: string,
  handles: string[],
  sessionId: string,
  credentials?: { username: string; password: string }
): void {
  const scriptPath = resolveCrawlerScriptPath();
  console.log(`Run status: ${runId} || handles: ${handles.join(', ')}`);
  const args = [scriptPath, '--profiles', ...handles, '--session-id', sessionId, '-f', '-s', '-hl', '-r'];
  void scrapeMultipleProfiles(handles)

  return ;

  // if (credentials) {
  //   args.push('-l', credentials.username, '-p', credentials.password);
  // }
  //
  // let child: ReturnType<typeof spawn>;
  // let stdoutBuffer = '';
  // let stderrBuffer = '';
  // try {
  //   child = spawn(pythonExecutable(), args, {
  //     stdio: ['inherit', 'pipe', 'pipe']
  //   });
  // } catch (error) {
  //   console.error('Failed to spawn crawler process', {
  //     runId,
  //     handles,
  //     scriptPath,
  //     args,
  //     error
  //   });
  //   updateRunStatus(runId, 'failure', error instanceof Error ? error.message : 'Unknown spawn error').catch((err) => {
  //     console.error('Failed to update run failure status after spawn error', err);
  //   });
  //   return;
  // }
  //
  // child.stdout?.on('data', (chunk) => {
  //   const text = chunk.toString();
  //   stdoutBuffer += text;
  //   process.stdout.write(chunk);
  // });
  //
  // child.stderr?.on('data', (chunk) => {
  //   const text = chunk.toString();
  //   stderrBuffer += text;
  //   process.stderr.write(chunk);
  // });
  //
  // const buildFailureMessage = (code: number | null): string => {
  //   const combined = `${stderrBuffer}\n${stdoutBuffer}`.trim();
  //   if (combined) {
  //     const lines = combined.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  //     const lastLine = lines[lines.length - 1];
  //     if (lastLine) {
  //       return lastLine.slice(-500);
  //     }
  //   }
  //   return `Process exited with code ${code ?? 'unknown'}`;
  // };
  //
  // child.once('spawn', () => {
  //   updateRunStatus(runId, 'running').catch((error) => {
  //     console.error('Failed to mark run running', error);
  //   });
  // });
  //
  // child.on('error', (error) => {
  //   console.error('Failed to execute crawler script', {
  //     runId,
  //     handles,
  //     scriptPath,
  //     args,
  //     error
  //   });
  //   updateRunStatus(runId, 'failure', error.message).catch((err) => {
  //     console.error('Failed to update run failure status', err);
  //   });
  // });
  //
  // child.on('close', (code) => {
  //   const status: CrawlRunStatus = code === 0 ? 'success' : 'failure';
  //   const message = code === 0 ? null : buildFailureMessage(code);
  //   if (status === 'failure') {
  //     console.error('Crawler process finished with failure', {
  //       runId,
  //       handles,
  //       scriptPath,
  //       exitCode: code
  //     });
  //   } else {
  //     scheduleIndexerRun(`run:${runId}`);
  //   }
  //   updateRunStatus(runId, status, message).catch((error) => {
  //     console.error('Failed to finalize run status', error);
  //   });
  // });
}
