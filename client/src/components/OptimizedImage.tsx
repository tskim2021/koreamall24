import { useState, useRef, useEffect, memo } from "react";

/**
 * 외부 이미지 URL을 /api/image-proxy 경유 WebP URL로 변환
 * - 외부 URL: 프록시 경유 (WebP 변환 + 리사이징)
 * - 내부 URL (/, /assets/): 그대로 사용
 */
export function getOptimizedSrc(
  src: string,
  width = 0,
  quality = 80
): string {
  if (!src) return src;
  // 이미 프록시 URL이면 그대로
  if (src.includes("/api/image-proxy")) return src;
  // 내부 정적 파일 — 프록시 불필요
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  // data URI
  if (src.startsWith("data:")) return src;
  // 외부 URL → 프록시 경유
  const params = new URLSearchParams({
    url: src,
    fmt: "webp",
    q: String(quality),
  });
  if (width > 0) params.set("w", String(width));
  return `/api/image-proxy?${params.toString()}`;
}

interface OptimizedImageProps {
  /** Primary image URL (original or largest available) */
  src: string | null | undefined;
  /** Medium-size variant URL (600px) */
  srcMedium?: string | null;
  /** Thumbnail variant URL (200px) */
  srcThumb?: string | null;
  /** Base64 blur placeholder data URL */
  blurDataUrl?: string | null;
  /** Alt text for accessibility */
  alt: string;
  /** CSS class for the image element */
  className?: string;
  /** CSS class for the container wrapper */
  containerClassName?: string;
  /** Image display size hint: determines which variant to prefer */
  size?: "thumb" | "medium" | "full";
  /** Width of the container (for srcSet sizes attribute) */
  width?: number | string;
  /** Height of the container */
  height?: number | string;
  /** Object fit mode */
  objectFit?: "cover" | "contain" | "fill" | "none";
  /** Fallback content when no image is available */
  fallback?: React.ReactNode;
  /** Whether to enable lazy loading (default: true) */
  lazy?: boolean;
  /** Fetch priority hint for LCP images (default: 'auto') */
  fetchpriority?: 'high' | 'low' | 'auto';
  /** Click handler */
  onClick?: () => void;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading with IntersectionObserver (loads only when visible)
 * - Blur placeholder while loading (smooth transition)
 * - Automatic srcSet for responsive images
 * - Graceful fallback for missing images
 * - Smooth fade-in animation on load
 */
function OptimizedImageInner({
  src,
  srcMedium,
  srcThumb,
  blurDataUrl,
  alt,
  className = "",
  containerClassName = "",
  size = "medium",
  width,
  height,
  objectFit = "contain",
  fallback,
  lazy = true,
  fetchpriority = 'auto',
  onClick,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Determine the best image URL based on size hint (with WebP proxy)
  const getImageUrl = (): string | null => {
    if (!src && !srcMedium && !srcThumb) return null;

    switch (size) {
      case "thumb": {
        const raw = srcThumb || srcMedium || src || null;
        return raw ? getOptimizedSrc(raw, 200, 75) : null;
      }
      case "medium": {
        const raw = srcMedium || src || null;
        return raw ? getOptimizedSrc(raw, 600, 80) : null;
      }
      case "full": {
        const raw = src || srcMedium || null;
        return raw ? getOptimizedSrc(raw, 0, 85) : null;
      }
      default: {
        const raw = srcMedium || src || null;
        return raw ? getOptimizedSrc(raw, 600, 80) : null;
      }
    }
  };

  const imageUrl = getImageUrl();

  // Build srcSet for responsive loading (with WebP proxy)
  const buildSrcSet = (): string | undefined => {
    const parts: string[] = [];
    if (srcThumb) parts.push(`${getOptimizedSrc(srcThumb, 200, 75)} 200w`);
    if (srcMedium) parts.push(`${getOptimizedSrc(srcMedium, 600, 80)} 600w`);
    if (src && src !== srcMedium) parts.push(`${getOptimizedSrc(src, 0, 85)} 1200w`);
    return parts.length > 1 ? parts.join(", ") : undefined;
  };

  // Build sizes attribute
  const buildSizes = (): string | undefined => {
    if (!buildSrcSet()) return undefined;
    switch (size) {
      case "thumb":
        return "200px";
      case "medium":
        return "(max-width: 640px) 100vw, 600px";
      case "full":
        return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1200px";
      default:
        return "(max-width: 640px) 100vw, 600px";
    }
  };

  if (!imageUrl || hasError) {
    return (
      <div
        ref={imgRef}
        className={`flex items-center justify-center bg-secondary/30 ${containerClassName}`}
        style={{ width, height }}
        onClick={onClick}
      >
        {fallback || (
          <span className="text-xs text-muted-foreground">No Image</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ width, height }}
      onClick={onClick}
    >
      {/* Blur placeholder background */}
      {blurDataUrl && !isLoaded && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)", // Prevent blur edges from showing
          }}
        />
      )}

      {/* Skeleton placeholder when no blur available */}
      {!blurDataUrl && !isLoaded && (
        <div className="absolute inset-0 z-0 bg-gray-100" />
      )}

      {/* Actual image - only render when in view */}
      {isInView && (
        <img
          src={imageUrl}
          srcSet={buildSrcSet()}
          sizes={buildSizes()}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding={lazy ? "async" : "sync"}
          fetchPriority={fetchpriority}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`relative z-10 transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          style={{
            objectFit,
            width: "100%",
            height: "100%",
          }}
        />
      )}
    </div>
  );
}

const OptimizedImage = memo(OptimizedImageInner);
export default OptimizedImage;
