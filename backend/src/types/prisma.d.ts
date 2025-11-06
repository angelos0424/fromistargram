declare module '@prisma/client' {
  export class PrismaClient {
    constructor(...args: any[]);
    account: {
      findMany(...args: any[]): Promise<any[]>;
      upsert(...args: any[]): Promise<any>;
    };
    post: {
      findMany(...args: any[]): Promise<any[]>;
      findUnique(...args: any[]): Promise<any | null>;
      upsert(...args: any[]): Promise<any>;
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
  }
}
