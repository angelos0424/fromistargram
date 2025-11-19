declare module '@prisma/client' {
  export type CrawlAccountStatus = 'ready' | 'error' | 'disabled';

  export type CrawlAccount = {
    id: string;
    username: string;
    status: CrawlAccountStatus;
    note: string | null;
    lastSessionAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type CrawlTarget = {
    id: string;
    handle: string;
    displayName: string;
    isActive: boolean;
    isFeatured: boolean;
    priority: number;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type CrawlRunStatus = 'queued' | 'running' | 'success' | 'failure';

  export type CrawlRun = {
    id: string;
    targetId: string;
    sessionAccountId: string | null;
    triggeredBy: string;
    sessionId: string;
    status: CrawlRunStatus;
    startedAt: Date;
    finishedAt: Date | null;
    message: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export class PrismaClient {
    constructor(...args: any[]);
    account: {
      findMany(...args: any[]): Promise<any[]>;
      upsert(...args: any[]): Promise<any>;
      delete(...args: any[]): Promise<any>;
      aggregate(...args: any[]): Promise<any>;
    };
    crawlAccount: {
      findMany(...args: any[]): Promise<CrawlAccount[]>;
      findUnique(...args: any[]): Promise<CrawlAccount | null>;
      create(...args: any[]): Promise<CrawlAccount>;
      update(...args: any[]): Promise<CrawlAccount>;
      delete(...args: any[]): Promise<CrawlAccount>;
    };
    crawlTarget: {
      findMany(...args: any[]): Promise<CrawlTarget[]>;
      findUnique(...args: any[]): Promise<CrawlTarget | null>;
      create(...args: any[]): Promise<CrawlTarget>;
      update(...args: any[]): Promise<CrawlTarget>;
      delete(...args: any[]): Promise<CrawlTarget>;
      aggregate(...args: any[]): Promise<any>;
      groupBy(...args: any[]): Promise<any[]>;
    };
    crawlRun: {
      findMany(...args: any[]): Promise<CrawlRun[]>;
      create(...args: any[]): Promise<CrawlRun>;
    };
    post: {
      findMany(...args: any[]): Promise<any[]>;
      findUnique(...args: any[]): Promise<any | null>;
      upsert(...args: any[]): Promise<any>;
      count(...args: any[]): Promise<number>;
      groupBy(...args: any[]): Promise<any[]>;
      aggregate(...args: any[]): Promise<any>;
    };
    media: {
      deleteMany(...args: any[]): Promise<any>;
      createMany(...args: any[]): Promise<any>;
    };
    profilePic: {
      deleteMany(...args: any[]): Promise<any>;
      createMany(...args: any[]): Promise<any>;
    };
    tag: {
      upsert(...args: any[]): Promise<any>;
    };
    postTag: {
      deleteMany(...args: any[]): Promise<any>;
      create(...args: any[]): Promise<any>;
    };
    postText: {
      upsert(...args: any[]): Promise<any>;
    };
    $transaction<T>(handler: (client: PrismaClient) => Promise<T>): Promise<T>;
    $transaction<T>(operations: any[]): Promise<T>;
  }
}
