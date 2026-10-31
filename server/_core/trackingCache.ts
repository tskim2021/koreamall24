/**
 * Tracking Information Caching System
 * 
 * Provides in-memory caching with TTL (Time To Live) for tracking information
 * Reduces API calls and improves response time
 */

import type { JapanPostTrackingStatus } from './japanPostTrackingV2';

interface CacheEntry {
  data: JapanPostTrackingStatus;
  timestamp: number;
  ttl: number; // milliseconds
}

class TrackingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Get cached tracking information
   * Returns null if cache expired or not found
   */
  get(trackingNumber: string): JapanPostTrackingStatus | null {
    const entry = this.cache.get(trackingNumber);
    
    if (!entry) {
      return null;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(trackingNumber);
      return null;
    }

    return entry.data;
  }

  /**
   * Set tracking information in cache
   * @param trackingNumber - Tracking number
   * @param data - Tracking status data
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   */
  set(
    trackingNumber: string,
    data: JapanPostTrackingStatus,
    ttl: number = 60 * 60 * 1000 // 1 hour default
  ): void {
    this.cache.set(trackingNumber, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if tracking information is cached
   */
  has(trackingNumber: string): boolean {
    const entry = this.cache.get(trackingNumber);
    if (!entry) return false;

    // Check if cache has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(trackingNumber);
      return false;
    }

    return true;
  }

  /**
   * Clear specific cache entry
   */
  clear(trackingNumber: string): void {
    this.cache.delete(trackingNumber);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries: Array<any> = [];
    const cacheEntries = Array.from(this.cache.entries());
    for (let i = 0; i < cacheEntries.length; i++) {
      const [key, value] = cacheEntries[i];
      entries.push({
        trackingNumber: key,
        cachedAt: new Date(value.timestamp),
        expiresAt: new Date(value.timestamp + value.ttl),
        ttlMs: value.ttl,
      });
    }
    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      const cacheEntries = Array.from(this.cache.entries());

      for (let i = 0; i < cacheEntries.length; i++) {
        const [key, entry] = cacheEntries[i];
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[Tracking Cache] Cleaned up ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    this.stopCleanup();
    this.clearAll();
  }
}

// Export singleton instance
export const trackingCache = new TrackingCache();

/**
 * Get tracking with cache support
 * Checks cache first, then fetches from API if needed
 */
export async function getTrackingWithCache(
  trackingNumber: string,
  fetchFn: (trackingNumber: string) => Promise<JapanPostTrackingStatus>,
  cacheTTL: number = 60 * 60 * 1000 // 1 hour default
): Promise<JapanPostTrackingStatus> {
  // Check cache first
  const cached = trackingCache.get(trackingNumber);
  if (cached) {
    console.log(`[Tracking Cache] Cache hit for ${trackingNumber}`);
    return cached;
  }

  // Fetch from API
  console.log(`[Tracking Cache] Cache miss for ${trackingNumber}, fetching from API`);
  const data = await fetchFn(trackingNumber);

  // Cache the result
  trackingCache.set(trackingNumber, data, cacheTTL);

  return data;
}

/**
 * Invalidate cache for a tracking number
 * Useful when shipment status is updated
 */
export function invalidateTrackingCache(trackingNumber: string): void {
  trackingCache.clear(trackingNumber);
  console.log(`[Tracking Cache] Invalidated cache for ${trackingNumber}`);
}

/**
 * Invalidate all tracking cache
 */
export function invalidateAllTrackingCache(): void {
  trackingCache.clearAll();
  console.log('[Tracking Cache] Invalidated all tracking cache');
}
