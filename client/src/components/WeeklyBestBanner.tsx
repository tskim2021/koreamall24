import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toProxyUrl } from "@/lib/imageProxy";
import { formatPrice } from "@/../../shared/utils/formatPrice";
import { parsePriceTiers, getLowestPrice } from "@/../../shared/utils/seoUtils";

interface Product {
  id: string | number;
  name: string;
  nameJa: string;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  imageUrlMedium?: string | null;
  rating?: number | string | null;
  reviewCount?: number | null;
  salesCount?: number | null;
  brandJa?: string | null;
  volume?: string | null;
  descriptionJa?: string | null;
  description?: string | null;
  searchTags?: string | null;
  setPricing?: string | null;
}

// Server-injected initial data (avoids API round-trip on first load)
const _serverData = (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) || {};

export function WeeklyBestBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const { data: bestProducts = [], isLoading } = trpc.product.getWeeklyBest.useQuery(
    { limit: 6 },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Use server-injected data as initial value so WeeklyBest shows instantly
      // Only use initialData if it has actual products (empty array would prevent API refetch)
      initialData: (_serverData.weeklyBest && _serverData.weeklyBest.length >= 3) ? _serverData.weeklyBest : undefined,
    }
  );
  const products: Product[] = bestProducts as any[];

  // 자동 슬라이드 (5초마다)
  useEffect(() => {
    if (!autoPlay || products.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay, products.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    setAutoPlay(false);
  };
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
    setAutoPlay(false);
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-pink-50 to-purple-50 py-6 px-4 rounded-xl">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-1" />
          </div>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row h-auto md:h-[380px]">
              <div className="md:w-[45%] flex items-center justify-center p-10">
                <div className="w-full h-48 md:h-64 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="md:w-[55%] flex flex-col justify-between p-7 space-y-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-12 w-full bg-gray-200 rounded animate-pulse mt-auto" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (products.length === 0) return null;

  const p = products[currentIndex];

  // 가격 계산
  const priceTiers = parsePriceTiers(p.setPricing);
  const lowestPrice = getLowestPrice(priceTiers, p.price);
  const hasTiers = priceTiers.length > 1;

  // 최고 할인율 계산
  const bestDiscount = (() => {
    if (p.setPricing) {
      try {
        const opts = typeof p.setPricing === "string" ? JSON.parse(p.setPricing) : p.setPricing;
        if (Array.isArray(opts) && opts.length > 0) {
          const best = opts.reduce((b: any, c: any) => Number(c.discountPercent ?? 0) > Number(b?.discountPercent ?? 0) ? c : b, null);
          if (best && Number(best.discountPercent) > 0) return Math.round(Number(best.discountPercent));
        }
      } catch { /* silent */ }
    }
    if (p.originalPrice && p.originalPrice > p.price) {
      return Math.round((1 - p.price / p.originalPrice) * 100);
    }
    return 0;
  })();

  // 설명 텍스트
  const descText = (() => {
    const raw = p.descriptionJa || p.description;
    if (!raw) return null;
    return String(raw).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  })();

  // 해시태그 - #tag1 #tag2, #tag1#tag2, tag1,tag2 형식 모두 지원
  const hashtags: string[] = [];
  if (p.searchTags) {
    p.searchTags.split(/[\s,]+|(?=#)/).filter(Boolean).forEach((t) => {
      const tag = t.startsWith("#") ? t : `#${t}`;
      if (tag.length > 1) hashtags.push(tag);
    });
  }

  // 옵션 태그
  const optionTags: string[] = (() => {
    if (!p.setPricing) return [];
    try {
      const opts = typeof p.setPricing === "string" ? JSON.parse(p.setPricing) : p.setPricing;
      if (!Array.isArray(opts)) return [];
      return opts.slice(0, 5).map((o: any) => o.quantity ? `${o.quantity}${o.unit || "箱"}` : o.label || "");
    } catch { return []; }
  })();

  return (
    <div className="w-full bg-gradient-to-r from-pink-50 to-purple-50 py-6 px-4 rounded-xl">
      <div className="max-w-6xl mx-auto">
        {/* 제목 */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">🏆 週間ベスト商品</h2>
          <p className="text-sm text-gray-500 mt-0.5">先週最も人気のある商品をご紹介します</p>
        </div>

        {/* 메인 슬라이드 카드 */}
        <div
          className="relative bg-white rounded-xl shadow-md overflow-hidden"
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
        >
          <div className="flex flex-col md:flex-row h-auto md:h-[380px]">
            {/* 이미지 영역 */}
            <div className="relative md:w-[45%] flex items-center justify-center bg-white p-6 md:p-10 border-b md:border-b-0 md:border-r border-gray-100">
              {/* 순위 뱃지 */}
              <span className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full z-10">
                #{currentIndex + 1}
              </span>
              {/* 할인율 뱃지 */}
              {bestDiscount > 0 && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                  {bestDiscount}%OFF
                </span>
              )}
              <Link href={`/product/${p.id}`}>
                {p.imageUrl ? (
                  <img
                    src={toProxyUrl(p.imageUrlMedium ?? p.imageUrl) as string}
                    alt={`${p.brandJa ? p.brandJa + " " : ""}${p.nameJa}`}
                    className="max-h-56 md:max-h-64 w-full object-contain hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-48 w-full bg-gray-100 flex items-center justify-center rounded-lg">
                    <span className="text-gray-400 text-sm">画像なし</span>
                  </div>
                )}
              </Link>
            </div>

            {/* 정보 영역 */}
            <div className="md:w-[55%] flex flex-col justify-between p-5 md:p-7 overflow-hidden">
              <div>
                {/* 브랜드 */}
                {p.brandJa && (
                  <p className="text-xs text-blue-600 font-medium mb-1">{p.brandJa}</p>
                )}
                {/* 영문명 */}
                {p.name && (
                  <p className="text-xs text-gray-400 mb-1 line-clamp-1">{p.name}</p>
                )}
                {/* 일본어 상품명 */}
                <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-1 leading-snug line-clamp-3">
                  {p.nameJa}
                </h3>
                {/* 용량 */}
                {p.volume && (
                  <p className="text-xs text-gray-500 mb-2">{p.volume}</p>
                )}

                {/* 가격 */}
                <div className="mb-3">
                  {bestDiscount > 0 && p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-sm text-gray-400 line-through mr-2">
                      {formatPrice(p.originalPrice)}
                    </span>
                  )}
                  <span className="text-2xl md:text-3xl font-bold text-pink-600">
                    {formatPrice(lowestPrice)}{hasTiers ? "〜" : ""}
                  </span>
                </div>

                {/* 옵션 태그 */}
                {optionTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {optionTags.map((tag, i) => (
                      <span key={i} className="text-xs text-blue-700 bg-blue-50 rounded-full px-2.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 평점 */}
                {p.rating !== undefined && p.rating !== null && p.reviewCount && p.reviewCount > 0 && Number(p.rating) > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.round(Number(p.rating) || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {Number(p.rating ?? 0).toFixed(1)} ({p.reviewCount || 0}件)
                    </span>
                  </div>
                )}

                {/* 설명 */}
                {descText && (
                  <p className="text-xs text-gray-600 line-clamp-3 mb-3 leading-relaxed">
                    {descText}
                  </p>
                )}

                {/* 해시태그 */}
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {hashtags.slice(0, 4).map((tag, i) => (
                      <span key={i} className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 판매량 + 버튼 */}
              <div>
                {p.salesCount !== undefined && p.salesCount !== null && p.salesCount > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    💰 今週: <strong>{p.salesCount}</strong>個
                  </p>
                )}
                <Link href={`/product/${p.id}`}>
                  <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5">
                    詳しく見る
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* 좌우 화살표 */}
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* 하단 도트 인디케이터 */}
          <div className="flex justify-center gap-2 py-3 bg-gray-50 border-t border-gray-100">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => { setCurrentIndex(index); setAutoPlay(false); }}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-pink-600 w-8" : "bg-gray-300 hover:bg-gray-400 w-2"
                }`}
              />
            ))}
          </div>
        </div>

        {/* 미니 썸네일 */}
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1">
          {products.map((product, index) => (
            <button
              key={product.id}
              onClick={() => { setCurrentIndex(index); setAutoPlay(false); }}
              className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex ? "border-pink-600 shadow-md" : "border-transparent hover:border-gray-300"
              }`}
            >
              {product.imageUrl ? (
                <img
                  src={toProxyUrl(product.imageUrl) as string}
                  alt={product.nameJa}
                  className="w-20 h-20 object-contain bg-white p-1"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-400">No Image</span>
                </div>
              )}
              <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                #{index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
