import { redisClient } from '../../config/redis';
import { metricsRegistry } from '../../config/metrics';
import { logger } from '../../config/logger';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

export class CacheService {
  private memoryStore: Map<string, MemoryEntry> = new Map();
  private maxMemoryEntries = 2000;

  /**
   * Standardize tenant-safe cache key.
   * Format: tenant:{institutionId}:{resource}:{resourceId}
   */
  public static buildTenantKey(institutionId: string, resource: string, resourceId: string): string {
    const safeInst = institutionId || 'global';
    const safeRes = resource.toLowerCase();
    const safeId = resourceId.toLowerCase();
    return `tenant:${safeInst}:${safeRes}:${safeId}`;
  }

  /**
   * Standardize tenant-prefix for wildcard invalidation.
   */
  public static buildTenantPrefix(institutionId: string, resource?: string): string {
    const safeInst = institutionId || 'global';
    if (resource) {
      return `tenant:${safeInst}:${resource.toLowerCase()}:*`;
    }
    return `tenant:${safeInst}:*`;
  }

  /**
   * Retrieve cached value.
   */
  public async get<T>(key: string): Promise<T | null> {
    // 1. Try Redis
    if (redisClient.isConnected()) {
      const raw = await redisClient.get(key);
      if (raw) {
        metricsRegistry.recordCacheHit();
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      }
      metricsRegistry.recordCacheMiss();
      return null;
    }

    // 2. Memory Fallback
    const entry = this.memoryStore.get(key);
    if (!entry) {
      metricsRegistry.recordCacheMiss();
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      metricsRegistry.recordCacheMiss();
      return null;
    }

    metricsRegistry.recordCacheHit();
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set value in cache with TTL (seconds).
   */
  public async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    // 1. Try Redis
    if (redisClient.isConnected()) {
      await redisClient.set(key, serialized, ttlSeconds);
      return;
    }

    // 2. Memory Fallback with LRU eviction guard
    if (this.memoryStore.size >= this.maxMemoryEntries) {
      // Evict oldest entry (first key in Map iterator)
      const oldestKey = this.memoryStore.keys().next().value;
      if (oldestKey) this.memoryStore.delete(oldestKey);
    }

    this.memoryStore.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Helper to retrieve from cache or execute producer and cache the result.
   */
  public async getOrSet<T>(key: string, producer: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await producer();
    if (fresh !== undefined && fresh !== null) {
      await this.set<T>(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Invalidate a specific key.
   */
  public async del(key: string): Promise<void> {
    if (redisClient.isConnected()) {
      await redisClient.del(key);
    }
    this.memoryStore.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern.
   * Example: cacheService.invalidatePrefix("tenant:inst-123:students:*")
   */
  public async invalidatePrefix(pattern: string): Promise<number> {
    let count = 0;

    // 1. Invalidate Redis
    if (redisClient.isConnected()) {
      count = await redisClient.delByPattern(pattern);
    }

    // 2. Invalidate Memory Store
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of this.memoryStore.keys()) {
      if (regexPattern.test(k)) {
        this.memoryStore.delete(k);
        count++;
      }
    }

    logger.debug({ pattern, invalidatedCount: count }, 'Cache Prefix Invalidation Executed');
    return count;
  }

  /**
   * Clear all cache entries.
   */
  public async clear(): Promise<void> {
    if (redisClient.isConnected()) {
      await redisClient.delByPattern('*');
    }
    this.memoryStore.clear();
  }

  public getMemorySize(): number {
    return this.memoryStore.size;
  }
}

export const cacheService = new CacheService();
