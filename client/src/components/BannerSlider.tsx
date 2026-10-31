import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

// Server-injected initial data (avoids API round-trip on first load)
const _serverData = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || {};

interface BannerSliderProps {
  // Real product photos to composite into text-only (no dedicated creative) banners,
  // so those slides read as photo-based hero art instead of a flat color block.
  heroImages?: string[];
}

export default function BannerSlider({ heroImages }: BannerSliderProps = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { data: banners, isLoading } = trpc.banner.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Use server-injected data as initial value so banner shows instantly without API call
    initialData: _serverData.banners?.length > 0 ? _serverData.banners : undefined,
  });

  // 로딩 완료 후 등록된 배너가 있으면 사용, 없으면 빈 배열 (기본 더미 배너 제거)
  const displayBanners = banners && banners.length > 0 ? banners : [];

  useEffect(() => {
    setCurrentIndex((prev) => (prev >= displayBanners.length ? 0 : prev));
  }, [displayBanners.length]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  }, [displayBanners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(
      (prev) => (prev - 1 + displayBanners.length) % displayBanners.length
    );
  }, [displayBanners.length]);

  useEffect(() => {
    if (displayBanners.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, displayBanners.length]);

  // 로딩 중: shimmer 스켈레톤 표시
  if (isLoading) {
    return (
      <>
        <style>{`@keyframes banner-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`}</style>
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "4/1",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "banner-shimmer 1.5s infinite",
          }}
        />
      </>
    );
  }

  // 등록된 배너가 없으면 아무것도 표시하지 않음
  if (displayBanners.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        .banner-slider-root .banner-slide-inner { aspect-ratio: 16/9; }
        @media (max-width: 639px) {
          .banner-slider-root .banner-slide-inner {
            aspect-ratio: unset;
            height: calc(100vw / 3 + 40px);
            position: relative;
            overflow: hidden;
          }
          .banner-slider-root .banner-slide-inner img {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center center;
          }
        }
        @media (min-width: 640px) { .banner-slider-root .banner-slide-inner { aspect-ratio: 2/1; } }
      `}</style>
      <div className="banner-slider-root relative w-full" style={{ overflow: "hidden" }}>
        {/* Slides */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / displayBanners.length)}%)`,
            width: `${displayBanners.length * 100}%`,
          }}
        >
          {displayBanners.map((banner, idx) => {
            const hasImage = !!(banner as any).imageUrl;
            const linkUrl = (banner as any).linkUrl || "/";

            const slideContent = hasImage ? (
              <div className="banner-slide-inner relative w-full">
                <img
                  src={(banner as any).imageUrl}
                  alt={(banner as any).titleJa || ""}
                  className="w-full h-full object-cover object-center"
                  style={{ display: "block" }}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                />
              </div>
            ) : (
              <div
                className="banner-slide-inner qoo-hero-fallback w-full"
                style={{ background: "linear-gradient(135deg, #0f1c3f 0%, #1a2a5e 55%, #2d1b4e 100%)" }}
              >
                {heroImages && heroImages.length > 0 && (
                  <>
                    <div className="qoo-hero-burst absolute right-[-4%] md:right-[2%] top-1/2 -translate-y-1/2 h-[95%] md:h-[130%] aspect-square" />
                    <img
                      src={heroImages[idx % heroImages.length]}
                      alt=""
                      aria-hidden="true"
                      className="qoo-hero-product-img absolute right-[2%] md:right-[8%] top-1/2 -translate-y-1/2 h-[75%] md:h-[90%] w-auto object-contain"
                      loading={idx === 0 ? "eager" : "lazy"}
                    />
                  </>
                )}
                <div className="h-full flex items-center px-6 md:px-12 relative z-10">
                  <div className="space-y-2 md:space-y-3 max-w-[65%] md:max-w-[55%]">
                    {(banner as any).subtitleJa && (
                      <span className="qoo-hero-badge">{(banner as any).subtitleJa}</span>
                    )}
                    <h2 className="qoo-hero-title text-lg md:text-5xl font-extrabold text-white block">
                      {(banner as any).titleJa}
                    </h2>
                  </div>
                </div>
              </div>
            );

            return (
              <div
                key={(banner as any).id}
                className="flex-shrink-0"
                style={{ width: `${100 / displayBanners.length}%` }}
              >
                {hasImage ? <Link href={linkUrl}>{slideContent}</Link> : slideContent}
              </div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {displayBanners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow hover:bg-white transition-colors z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow hover:bg-white transition-colors z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {displayBanners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {displayBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-pink-600"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
