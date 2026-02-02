import { Redis } from 'ioredis';

type CacheValue = string;

type CacheAdapter = {
  get(key: string): Promise<CacheValue | null>;
  set(key: string, value: CacheValue, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(prefix: string): Promise<void>;
};

class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: CacheValue; expiresAt: number | null }>();

  async get(key: string): Promise<CacheValue | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(prefix: string): Promise<void> {
    if (prefix === '') {
      this.store.clear();
      return;
    }

    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

class RedisCacheAdapter implements CacheAdapter {
  private readonly client: Redis;
  private isHealthy = false;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      // Retry strategy: exponential backoff with max delay
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis reconnecting, attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      // Keep connection alive
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      // Connection timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    // Setup event handlers
    this.client.on('connect', () => {
      console.log('Redis client connecting...');
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
      this.isHealthy = true;
    });

    this.client.on('error', (error: Error) => {
      console.error('Redis client error:', error);
      this.isHealthy = false;
    });

    this.client.on('close', () => {
      console.warn('Redis connection closed');
      this.isHealthy = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });

    this.client.on('end', () => {
      console.warn('Redis connection ended');
      this.isHealthy = false;
    });

    // Initial connection
    this.client.connect().catch((error: unknown) => {
      console.warn('Failed to initially connect to Redis, will retry automatically', error);
    });
  }

  /**
   * Check if Redis is currently healthy
   */
  isConnected(): boolean {
    return this.isHealthy && this.client.status === 'ready';
  }

  async get(key: string): Promise<CacheValue | null> {
    // Fast path: if disconnected, skip cache
    if (!this.isConnected()) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error: unknown) {
      console.warn('Redis get error, treating as cache miss', { key, error });
      return null;
    }
  }

  async set(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
    // Fast path: if disconnected, skip cache write
    if (!this.isConnected()) {
      return;
    }

    try {
      if (ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error: unknown) {
      console.warn('Redis set error, skipping cache write', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    // Best effort: try even if connection seems unhealthy
    try {
      await this.client.del(key);
    } catch (error: unknown) {
      console.warn('Redis delete error, skipping cache delete', { key, error });
    }
  }

  async clear(prefix: string): Promise<void> {
    const pattern = `${prefix}*`;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } while (cursor !== '0');
    } catch (error: unknown) {
      console.warn('Redis clear error, skipping cache clear', error);
    }
  }
}

const namespace = process.env.API_CACHE_NAMESPACE ?? 'fromistargram:api';
const ttlDefaultSeconds = Number.parseInt(process.env.API_CACHE_TTL ?? '30', 10);

const adapter: CacheAdapter = process.env.REDIS_URL
  ? new RedisCacheAdapter(process.env.REDIS_URL)
  : new MemoryCacheAdapter();

const prefix = `${namespace}:`;

function buildKey(key: string): string {
  return `${prefix}${key}`;
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const raw = await adapter.get(buildKey(key));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to parse cached value, clearing key', error);
    await adapter.delete(buildKey(key));
    return null;
  }
}

export async function setCachedValue<T>(key: string, value: T, ttlSeconds = ttlDefaultSeconds): Promise<void> {
  const payload = JSON.stringify(value);
  await adapter.set(buildKey(key), payload, ttlSeconds);
}

export async function deleteCachedValue(key: string): Promise<void> {
  await adapter.delete(buildKey(key));
}

export async function clearCache(): Promise<void> {
  await adapter.clear(prefix);
}

export async function withCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds = ttlDefaultSeconds
): Promise<T> {
  const cached = await getCachedValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await setCachedValue(key, value, ttlSeconds);
  return value;
}

export function cacheKey(parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .map((part) =>
      part === null || part === undefined
        ? 'null'
        : typeof part === 'boolean'
        ? part ? '1' : '0'
        : String(part)
    )
    .join(':');
}

export function cacheTtlSeconds(): number {
  return ttlDefaultSeconds;
}
