import crypto from 'crypto';

interface CacheEntry {
  response: any;
  expiresAt: number;
}

export class AICache {
  private static store = new Map<string, CacheEntry>();

  /**
   * Generate tenant-scoped cache key.
   */
  public static createKey(params: {
    organizationId: string;
    institutionId: string;
    feature: string;
    query: string;
    userScope?: string;
  }): string {
    const hash = crypto.createHash('sha256').update(params.query.trim().toLowerCase()).digest('hex').slice(0, 16);
    return `${params.organizationId}:${params.institutionId}:${params.userScope || 'global'}:${params.feature}:${hash}`;
  }

  public static get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.response;
  }

  public static set(key: string, response: any, ttlSeconds = 1800): void {
    this.store.set(key, {
      response,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public static clear(): void {
    this.store.clear();
  }
}
