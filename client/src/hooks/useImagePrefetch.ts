/**
 * useImagePrefetch
 * 상품 목록이 로드된 후 유휴 시간에 이미지를 미리 다운로드하여
 * 브라우저 캐시에 채워두는 훅.
 *
 * 동작 방식:
 * - requestIdleCallback (또는 setTimeout fallback)을 사용해 메인 스레드가 유휴일 때만 실행
 * - 한 번에 BATCH_SIZE개씩 순차적으로 로드 (네트워크 혼잡 방지)
 * - 이미 캐시된 이미지는 건너뜀 (Set으로 중복 방지)
 */

import { useEffect, useRef } from 'react';

// 이미 프리페치한 URL 추적 (전역 Set - 페이지 이동 후에도 유지)
const prefetchedUrls = new Set<string>();

const BATCH_SIZE = 4; // 동시 로드 수
const BATCH_DELAY = 300; // 배치 간 대기 ms

function getProxyUrl(originalUrl: string): string {
  if (!originalUrl) return '';
  // 이미 프록시 URL이면 그대로 사용
  if (originalUrl.startsWith('/api/image-proxy')) return originalUrl;
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}&w=400&q=75`;
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (prefetchedUrls.has(url)) { resolve(); return; }
    prefetchedUrls.add(url);
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // 실패해도 무시
    img.src = url;
  });
}

async function prefetchBatch(urls: string[]) {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const pending = urls.filter(u => u && !prefetchedUrls.has(u));
  
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(url => preloadImage(getProxyUrl(url))));
    if (i + BATCH_SIZE < pending.length) {
      await sleep(BATCH_DELAY);
    }
  }
}

interface Product {
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  image?: string | null;
  imageUrl?: string | null;
}

/**
 * 상품 목록의 이미지를 유휴 시간에 미리 로드
 * @param products 상품 목록 (thumbnail 또는 thumbnailUrl 필드 포함)
 * @param enabled 활성화 여부 (기본 true)
 */
export function useImagePrefetch(products: Product[] | undefined | null, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !products || products.length === 0) return;

    // 이미지 URL 수집
    const imageUrls = products
      .map(p => p.thumbnail || p.thumbnailUrl || p.image || p.imageUrl || '')
      .filter(Boolean);

    if (imageUrls.length === 0) return;

    // 이미 모두 캐시된 경우 건너뜀
    const uncached = imageUrls.filter(u => !prefetchedUrls.has(getProxyUrl(u)));
    if (uncached.length === 0) return;

    // 유휴 시간에 실행
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(
        () => { prefetchBatch(imageUrls); },
        { timeout: 3000 }
      );
      return () => cancelIdleCallback(handle);
    } else {
      // fallback: 1.5초 후 실행
      timerRef.current = setTimeout(() => { prefetchBatch(imageUrls); }, 1500);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [products, enabled]);
}
