import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

class RedisManager {
  private client: Redis | null = null;
  private isAvailable = false;
  private hasWarned = false;

  constructor() {
    if (env.REDIS_URL) {
      this.initializeClient(env.REDIS_URL);
    }
  }

  private initializeClient(redisUrl: string) {
    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) {
            if (!this.hasWarned) {
              logger.warn({ times }, 'Redis connection attempts exceeded limit. Using memory fallback.');
              this.hasWarned = true;
            }
            return null; // Stop retrying
          }
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isAvailable = true;
        this.hasWarned = false;
        logger.info('Connected to Redis server successfully.');
      });

      this.client.on('error', (err) => {
        this.isAvailable = false;
        if (!this.hasWarned) {
          logger.warn({ error: err.message }, 'Redis connection error. Operations falling back gracefully.');
          this.hasWarned = true;
        }
      });

      this.client.on('close', () => {
        this.isAvailable = false;
      });

      // Attempt non-blocking connection
      this.client.connect().catch((err) => {
        this.isAvailable = false;
        logger.warn({ error: err.message }, 'Redis initial connection failed; operating in fallback mode.');
      });
    } catch (err: any) {
      this.client = null;
      this.isAvailable = false;
      logger.warn({ error: err.message }, 'Failed to initialize Redis client.');
    }
  }

  public isConfigured(): boolean {
    return Boolean(env.REDIS_URL && this.client);
  }

  public isConnected(): boolean {
    return this.isAvailable && Boolean(this.client && this.client.status === 'ready');
  }

  public async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch (err) {
      return false;
    }
  }

  public getRawClient(): Redis | null {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected() || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected() || !this.client) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  public async del(key: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  public async delByPattern(pattern: string): Promise<number> {
    if (!this.isConnected() || !this.client) return 0;
    try {
      const stream = this.client.scanStream({ match: pattern, count: 50 });
      let deleted = 0;
      for await (const keys of stream) {
        if (keys.length) {
          const pipeline = this.client.pipeline();
          keys.forEach((k: string) => pipeline.del(k));
          await pipeline.exec();
          deleted += keys.length;
        }
      }
      return deleted;
    } catch (err) {
      return 0;
    }
  }

  public async quit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed gracefully.');
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Redis quit encountered an error.');
      }
    }
  }
}

export const redisClient = new RedisManager();
