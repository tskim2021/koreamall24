/**
 * Convert external image URLs to server proxy URL only when necessary.
 * - Local paths (/images/...) → returned as-is
 * - Own CDN/S3 URLs (cloudfront.net, amazonaws.com, manus.space, cocokusuri.com) → direct load (fast)
 * - Other external HTTP(S) URLs → proxied via server to avoid hotlink blocking + WebP conversion
 */

// Domains that allow direct image loading (no proxy needed)
const DIRECT_DOMAINS = [
  'cloudfront.net',
  'amazonaws.com',
  's3.ap-northeast',
  'manus.space',
  'cocokusuri.com',
  'localhost',
  '127.0.0.1',
];

export function toProxyUrl(
  url: string | null | undefined,
  options?: { width?: number; quality?: number; fmt?: 'webp' | 'jpeg' | 'original' }
): string | null | undefined {
  if (!url) return url;
  // 로컬 경로는 그대로 반환
  if (url.startsWith('/')) return url;
  // data URI
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 자체 CDN/S3 도메인은 직접 로딩 (프록시 불필요, 빠름)
    try {
      const hostname = new URL(url).hostname;
      if (DIRECT_DOMAINS.some(d => hostname.includes(d))) {
        return url;
      }
    } catch {
      // URL 파싱 실패 시 프록시 사용
    }
    // 외부 이미지는 서버 프록시 사용 (hotlink 차단 우회 + WebP 변환)
    const params = new URLSearchParams({ url });
    params.set('fmt', options?.fmt ?? 'webp');
    params.set('q', String(options?.quality ?? 80));
    if (options?.width && options.width > 0) params.set('w', String(options.width));
    return `/api/image-proxy?${params.toString()}`;
  }
  return url;
}

/** getOptimizedSrc — WebP 프록시 적용 (외부 URL만), 내부 URL은 그대로 */
export function getOptimizedSrc(
  url: string | null | undefined,
  width = 0,
  quality = 80
): string {
  return toProxyUrl(url, { width, quality }) ?? '';
}
