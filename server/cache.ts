/**
 * Simple in-memory TTL cache for server-side data caching.
 * Used to cache frequently accessed, rarely changing data (banners, product lists, categories).
 *
 * PM2 cluster mode: cache invalidation is broadcast to all instances via IPC.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

// PM2 IPC: receive cache invalidation from other instances
if (process.env.NODE_APP_INSTANCE !== undefined) {
  process.on('message', (msg: any) => {
    if (msg && msg.type === 'CACHE_INVALIDATE' && typeof msg.keyOrPrefix === 'string') {
      // Apply locally without re-broadcasting
      _localCacheInvalidate(msg.keyOrPrefix);
    }
  });
}

function _localCacheInvalidate(keyOrPrefix: string): void {
  const keys = Array.from(store.keys());
  for (const key of keys) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix + ':')) {
      store.delete(key);
    }
  }
}

/**
 * Get a cached value. Returns undefined if not found or expired.
 */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data;
}

/**
 * Set a cached value with TTL in milliseconds.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate a specific cache key (or all keys matching a prefix).
 * In PM2 cluster mode, broadcasts to all other instances via IPC.
 */
export function cacheInvalidate(keyOrPrefix: string): void {
  // Invalidate locally
  _localCacheInvalidate(keyOrPrefix);

  // Broadcast to other PM2 cluster instances
  if (process.send) {
    try {
      process.send({ type: 'CACHE_INVALIDATE', keyOrPrefix });
    } catch (_) {
      // Non-fatal: IPC may not be available
    }
  }
}

/**
 * Helper: get from cache or fetch and store.
 * Includes in-flight deduplication to prevent cache stampede:
 * if multiple requests miss the cache simultaneously, only one DB query is made.
 */
const inflight = new Map<string, Promise<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;

  // Deduplicate concurrent fetches for the same key
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher().then(data => {
    cacheSet(key, data, ttlMs);
    inflight.delete(key);
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise as Promise<unknown>);
  return promise;
}

/** 30 minutes in milliseconds */
export const TTL_30MIN = 30 * 60 * 1000;
/** 5 minutes in milliseconds */
export const TTL_5MIN = 5 * 60 * 1000;
/** 10 minutes in milliseconds */
export const TTL_10MIN = 10 * 60 * 1000;
/** 1 minute in milliseconds - for product lists to ensure fast sync across PM2 cluster */
export const TTL_1MIN = 1 * 60 * 1000;

/**
 * Warm up the cache on server start - LIGHTWEIGHT version.
 * Runs tasks sequentially with delays to avoid overloading Cloud Run (512MB/1vCPU).
 * Only warms up the most critical data (banners + categories) immediately,
 * then warms up product lists gradually after server is stable.
 */
export async function warmupCache(): Promise<void> {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const db = await import('./db');
    const { getActiveBanners, getAllCategories } = db;

    // Phase 1: Critical data (banners + categories + announcements + events) - runs immediately
    const { getAllAnnouncements, getAllEvents } = db;
    await Promise.allSettled([
      withCache('banner:main', TTL_30MIN, () => getActiveBanners('main')),
      withCache('category:list', TTL_1MIN, () => getAllCategories()),
      withCache('announcements:all', TTL_10MIN, () => getAllAnnouncements()),
      withCache('events:all', TTL_10MIN, () => getAllEvents()),
    ]);
    console.log('[Cache] Phase 1 warmup complete (banners + categories + announcements + events)');

    // Phase 2: Product lists - sequential with 800ms gaps, starts 5s after server ready
    (async () => {
      try {
        await sleep(5000);
        const {
          getWeeklyBestProducts,
          mergeProductThumbnails,
          getHitProducts,
          getNewProducts,
          getPopularProducts,
          getMonthlySaleProducts,
          getTimeSaleProducts,
          getTodayBestSellingProducts,
          getRecommendedProducts,
        } = db;

        const tasks: Array<[string, () => Promise<unknown>]> = [
          ['product:hitProducts:10', async () => mergeProductThumbnails(await getHitProducts(10))],
          ['product:weeklyBest:6', async () => mergeProductThumbnails(await getWeeklyBestProducts(6))],
          ['product:todayBest:10', async () => mergeProductThumbnails(await getTodayBestSellingProducts(10))],
          ['product:newArrivals', async () => mergeProductThumbnails(await getNewProducts())],
          ['product:popular', async () => mergeProductThumbnails(await getPopularProducts())],
          ['product:recommended:12', async () => mergeProductThumbnails(await getRecommendedProducts(12))],
          ['product:timeSale', async () => mergeProductThumbnails(await getTimeSaleProducts())],
          ['product:monthlySale', async () => mergeProductThumbnails(await getMonthlySaleProducts())],
        ];

        for (const [key, fetcher] of tasks) {
          try {
            await withCache(key, TTL_5MIN, fetcher as () => Promise<unknown>);
          } catch (_) { /* non-fatal */ }
          await sleep(800);
        }
        console.log('[Cache] Phase 2 warmup complete (product lists)');

        // Phase 3: 카테고리별 상품 워맘업 (newest 30개)
        try {
          await sleep(2000);
          const { getAllCategories, getProductsByCategory, mergeProductThumbnails } = db;
          const allCats = await getAllCategories();
          for (const cat of allCats.slice(0, 15)) { // 상위 15개 카테고리만
            const key = `category:${cat.id}:products:newest:30:0`;
            await withCache(key, TTL_5MIN, async () =>
              mergeProductThumbnails(await getProductsByCategory(cat.id, { sortBy: 'newest', limit: 30, offset: 0 }))
            );
            await sleep(300);
          }
          console.log('[Cache] Phase 3 warmup complete (category products)');
        } catch (e) {
          console.warn('[Cache] Phase 3 warmup failed (non-fatal):', e);
        }

        // Phase 4: 인기 상품 상세 페이지 미리 캐시 (top 20)
        try {
          await sleep(2000);
          const { getProductById, getProductImageOrder, getActiveProductPriceTiers } = db;
          const popularList = await getPopularProducts();
          const topProducts = popularList.slice(0, 50); // top 50 product detail warmup
          for (const p of topProducts) {
            try {
              await Promise.allSettled([
                withCache(`product:detail:${p.id}`, TTL_5MIN, () => getProductById(p.id)),
                withCache(`product:imageOrder:${p.id}`, TTL_10MIN, () => getProductImageOrder(p.id).catch(() => [])),
                withCache(`product:priceTiers:${p.id}`, TTL_10MIN, () => getActiveProductPriceTiers(p.id)),
              ]);
            } catch (_) { /* non-fatal */ }
            await sleep(200);
          }
          console.log(`[Cache] Phase 4 warmup complete (${topProducts.length} product details)`);
        } catch (e) {
          console.warn('[Cache] Phase 4 warmup failed (non-fatal):', e);
        }

        // Phase 5: nginx HTML 캐시 사전 워밍업
        // localhost:3000으로 직접 HTTP 요청하여 nginx 캐시를 미리 채움
        // 이렇게 하면 사용자 첫 방문 시에도 캐시 HIT 상태가 됨
        try {
          await sleep(3000);
          const { getAllProducts, getPopularProducts: getPopular } = db;

          // 워밍업할 URL 목록 수집 (인기 상품 + 전체 상품 상위 200개)
          const [popularResult, allResult] = await Promise.allSettled([
            getPopular(),
            getAllProducts(),
          ]);
          const popularIds = popularResult.status === 'fulfilled'
            ? popularResult.value.map((p: any) => p.id)
            : [];
          const allIds = allResult.status === 'fulfilled'
            ? allResult.value.slice(0, 200).map((p: any) => p.id)
            : [];

          // 중복 제거 후 인기 상품 우선 정렬
          const seen = new Set<number>();
          const productIds: number[] = [];
          for (const id of [...popularIds, ...allIds]) {
            if (!seen.has(id)) { seen.add(id); productIds.push(id); }
          }

          // 정적 페이지 목록
          const staticPages = ['/ranking', '/sale', '/new-arrivals', '/recommended', '/reviews', '/'];

          // localhost:3000으로 직접 요청 (nginx를 통하지 않고 Node.js에 직접)
          // Node.js HTML 캐시(htmlPageCache)를 채우는 방식
          const baseUrl = 'http://127.0.0.1:3000';
          const fetchOpts = { headers: { 'User-Agent': 'CacheWarmup/1.0', 'Accept': 'text/html' } };

          // 정적 페이지 먼저 워밍업
          for (const page of staticPages) {
            try {
              await fetch(`${baseUrl}${page}`, fetchOpts);
            } catch (_) { /* non-fatal */ }
            await sleep(200);
          }

          // 상품 페이지 워밍업 (배치로 처리)
          let warmedCount = 0;
          const BATCH_SIZE = 5;
          for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            const batch = productIds.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
              batch.map(id => fetch(`${baseUrl}/product/${id}`, fetchOpts).catch(() => null))
            );
            warmedCount += batch.length;
            await sleep(500); // 배치 간 500ms 대기 (서버 부하 방지)
          }

          console.log(`[Cache] Phase 5 warmup complete (${warmedCount} product pages + ${staticPages.length} static pages pre-cached)`);
        } catch (e) {
          console.warn('[Cache] Phase 5 warmup failed (non-fatal):', e);
        }
      } catch (e) {
        console.warn('[Cache] Phase 2 warmup failed (non-fatal):', e);
      }
    })();

  } catch (err) {
    console.warn('[Cache] Warmup failed (non-fatal):', err);
  }
}
