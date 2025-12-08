declare module '@prisma/client' {
  export type CrawlAccountStatus = 'ready' | 'error' | 'disabled';

  export type PostType = 'Post' | 'Story';

  export type Account = {
    id: string;
    latestProfilePicUrl: string | null;
    lastIndexedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    posts?: Post[];
    profilePics?: ProfilePic[];
    highlights?: Highlight[];
  };

  export type Post = {
    id: string;
    accountId: string;
    postedAt: Date;
    caption: string | null;
    hasText: boolean;
    createdAt: Date;
    updatedAt: Date;
    media: Media[];
    postText?: PostText | null;
    tags: PostTag[];
    type: PostType;
  };

  export type Media = {
    id: string;
    postId: string;
    orderIndex: number;
    filename: string;
    mime: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    createdAt: Date;
    post?: Post;
  };

  export type ProfilePic = {
    id: string;
    accountId: string;
    takenAt: Date;
    filename: string;
    createdAt: Date;
    account?: Account;
  };

  export type Tag = {
    id: number;
    name: string;
    posts?: PostTag[];
  };

  export type PostTag = {
    postId: string;
    tagId: number;
    post?: Post;
    tag: Tag;
  };

  export type PostText = {
    postId: string;
    content: string;
    updatedAt: Date;
    post?: Post;
  };

  export type Highlight = {
    id: string;
    accountId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    account?: Account;
    media: HighlightMedia[];
    coverMedia?: HighlightMedia | null;
  };

  export type HighlightMedia = {
    id: string;
    highlightId: string;
    filename: string;
    mime: string;
    orderIndex: number;
    createdAt: Date;
  };


  export type CrawlAccount = {
    id: string;
    username: string;
    password: string | null;
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
      findMany(...args: any[]): Promise<Account[]>;
      findUnique(...args: any[]): Promise<Account | null>;
      upsert(...args: any[]): Promise<Account>;
      delete(...args: any[]): Promise<Account>;
      aggregate(...args: any[]): Promise<any>;
      count(...args: any[]): Promise<number>;
    };
    crawlAccount: {
      findMany(...args: any[]): Promise<CrawlAccount[]>;
      findUnique(...args: any[]): Promise<CrawlAccount | null>;
      create(...args: any[]): Promise<CrawlAccount>;
      update(...args: any[]): Promise<CrawlAccount>;
      delete(...args: any[]): Promise<CrawlAccount>;
      count(...args: any[]): Promise<number>;
    };
    crawlTarget: {
      findMany(...args: any[]): Promise<CrawlTarget[]>;
      findUnique(...args: any[]): Promise<CrawlTarget | null>;
      create(...args: any[]): Promise<CrawlTarget>;
      update(...args: any[]): Promise<CrawlTarget>;
      delete(...args: any[]): Promise<CrawlTarget>;
      aggregate(...args: any[]): Promise<any>;
      groupBy(...args: any[]): Promise<any[]>;
      count(...args: any[]): Promise<number>;
    };
    crawlRun: {
      findMany(...args: any[]): Promise<CrawlRun[]>;
      create(...args: any[]): Promise<CrawlRun>;
      update(...args: any[]): Promise<CrawlRun>;
      count(...args: any[]): Promise<number>;
    };
    post: {
      findMany(...args: any[]): Promise<Post[]>;
      findUnique(...args: any[]): Promise<Post | null>;
      upsert(...args: any[]): Promise<Post>;
      count(...args: any[]): Promise<number>;
      groupBy(...args: any[]): Promise<any[]>;
      aggregate(...args: any[]): Promise<any>;
    };
    media: {
      deleteMany(...args: any[]): Promise<any>;
      createMany(...args: any[]): Promise<any>;
      findMany(...args: any[]): Promise<Media[]>;
    };
    profilePic: {
      deleteMany(...args: any[]): Promise<any>;
      createMany(...args: any[]): Promise<any>;
      findMany(...args: any[]): Promise<ProfilePic[]>;
    };
    tag: {
      findMany(...args: any[]): Promise<Tag[]>;
      upsert(...args: any[]): Promise<Tag>;
      count(...args: any[]): Promise<number>;
    };
    postTag: {
      deleteMany(...args: any[]): Promise<any>;
      create(...args: any[]): Promise<PostTag>;
    };
    postText: {
      upsert(...args: any[]): Promise<PostText>;
    };
    highlight: {
      findMany(...args: any[]): Promise<Highlight[]>;
      findUnique(...args: any[]): Promise<Highlight | null>;
      upsert(...args: any[]): Promise<Highlight>;
      update(...args: any[]): Promise<Highlight>;
      count(...args: any[]): Promise<number>;
    };
    highlightMedia: {
      deleteMany(...args: any[]): Promise<any>;
      createMany(...args: any[]): Promise<any>;
      create(...args: any[]): Promise<HighlightMedia>;
    }

    $transaction<T>(handler: (client: PrismaClient) => Promise<T>): Promise<T>;
    $transaction<T>(operations: any[]): Promise<T>;
  }
}
