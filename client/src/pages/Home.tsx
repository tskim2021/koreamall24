import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import BannerSlider from "@/components/BannerSlider";
import ProductSection from "@/components/ProductSection";
import CategoryGrid from "@/components/CategoryGrid";
import LatestReviews from "@/components/LatestReviews";
import { PersonalizedRecommendations } from "@/components/RecommendedProducts";
import { StaffRecommendedProducts } from "@/components/StaffRecommendedProducts";
import { WeeklyBestBanner } from "@/components/WeeklyBestBanner";
import PopularRankingSwiper from "@/components/PopularRankingSwiper";
import TimeSaleSideColumn from "@/components/TimeSaleSideColumn";
import HorizontalProductSection from "@/components/HorizontalProductSection";
import {
  Flame, Sparkles, ThumbsUp, Tag, Bell, MessageSquare
} from "lucide-react";
import HomeSidebar from "@/components/HomeSidebar";
import FloatingSideRail from "@/components/FloatingSideRail";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";

// Grab server-injected initial data (banners, products, etc.) for instant rendering
declare global {
  interface Window {
    __INITIAL_DATA__?: {
      banners?: any[];
      weeklyBest?: any[];
      categories?: any[];
      timeSale?: any[];
      monthlySale?: any[];
      popular?: any[];
      newArrivals?: any[];
      hitProducts?: any[];
      recommended?: any[];
      todayBest?: any[];
      allProducts?: any[];
      reviews?: any[];
      announcements?: any[];
      events?: any[];
    };
  }
}

const initialData = typeof window !== "undefined" ? window.__INITIAL_DATA__ : undefined;



export default function Home() {
  const { user } = useAuth();
  const STALE_30MIN = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };
  const STALE_10MIN = { staleTime: 10 * 60 * 1000, gcTime: 15 * 60 * 1000 };

  // All queries use server-injected initialData — no API round-trip on first load
  const { data: timeSaleProducts, isLoading: timeSaleLoading } = trpc.product.timeSale.useQuery(
    { limit: 9 },
    { ...STALE_30MIN, initialData: initialData?.timeSale }
  );
  const { data: monthlySaleProducts, isLoading: monthlySaleLoading } = trpc.product.monthlySale.useQuery(
    { limit: 9 },
    { ...STALE_30MIN, initialData: initialData?.monthlySale }
  );
  const { data: popularProducts, isLoading: popularLoading } = trpc.product.popular.useQuery(
    { limit: 10 },
    { ...STALE_30MIN, initialData: initialData?.popular }
  );
  const { data: todayBestProducts = [], isLoading: todayBestLoading } = trpc.product.todayBest.useQuery(
    { limit: 10 },
    { ...STALE_30MIN, initialData: initialData?.todayBest }
  );
  const { data: recentlyViewedProducts = [] } = trpc.product.getRecentlyViewed.useQuery(
    { limit: 8 },
    { enabled: !!user, ...STALE_10MIN }
  );
  const { data: newArrivalProducts = [], isLoading: newArrivalLoading } = trpc.product.newArrivals.useQuery(
    { limit: 10 },
    { ...STALE_30MIN, initialData: initialData?.newArrivals }
  );
  const { data: hitProducts = [], isLoading: hitProductsLoading } = trpc.product.hitProducts.useQuery(
    { limit: 10 },
    { ...STALE_30MIN, initialData: initialData?.hitProducts }
  );
  const { data: recommendedProducts = [], isLoading: recommendedLoading } = trpc.product.recommendedProducts.useQuery(
    { limit: 12 },
    { ...STALE_30MIN, initialData: initialData?.recommended }
  );
  const { data: allProducts = [] } = trpc.product.list.useQuery(
    { limit: 12 },
    { ...STALE_30MIN, initialData: initialData?.allProducts }
  );

  // 메인 페이지 상품 이미지 프리페치 - 유휴 시간에 브라우저 캐시에 미리 로드
  // 인기/히트/신상품/추천 상품 이미지를 미리 다운로드하여 상품 페이지 이동 시 즉시 표시
  const allPrefetchProducts = [
    ...(popularProducts ?? []),
    ...(hitProducts ?? []),
    ...(newArrivalProducts ?? []),
    ...(recommendedProducts ?? []),
    ...(todayBestProducts ?? []),
  ];
  useImagePrefetch(allPrefetchProducts);

  // 모바일 전용 공지 데이터
  const { data: latestAnnouncements = [] } = trpc.announcements.getAll.useQuery(
    undefined,
    { ...STALE_10MIN, initialData: initialData?.announcements }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="koreamall24｜医薬品・健康商品の個人輸入代行サイト"
        description="医薬品・健康商品の個人輸入代行サービス。正規品保証・送料無料・24時間対応。AGA・育毛、ダイエット、美容・スキンケア、ピル・避妊薬、感染症・性病対策、生活習慣病、免疫・アレルギー関連など幅広い商品を取り揃えています。"
        keywords="日本医薬品,個人輸入,健康商品,サプリメント,ダイエット,美容"
        ogType="website"
      />
      <Header />
      <FloatingSideRail />

      <main className="flex-1">
        {/* SEO: H1 Title */}
        <h1 className="sr-only">koreamall24 医薬品・健康商品の個人輸入</h1>
        <h2 className="sr-only">正規品保証の海外医薬品・ジェネリック通販サイト</h2>

        {/* 1. Banner Slider with category sidebar alongside it - qoo10 style */}
        <section className="py-3 md:py-4">
          <div className="container">
            <div className="home-hero-layout flex gap-3 items-stretch">
              <HomeSidebar compact hideTopBanner matchHeroHeight />
              <div className="home-hero-banner flex-1 min-w-0 rounded-xl overflow-hidden shadow-sm">
                <BannerSlider
                  heroImages={[
                    "/images/hero-cutouts/health-cream-cutout.png",
                    "/images/hero-cutouts/benzac-cutout.png",
                    "/images/hero-cutouts/tretiva-cutout.png",
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 1-b. Category browse row (icon grid) */}
        <CategoryGrid />

        {/* 1-c. Qoo10-style ranking row: real top-selling products, numbered, with a time-sale column beside it */}
        {!todayBestLoading && todayBestProducts && todayBestProducts.length > 0 && (
          <section className="py-2">
            <div className="container">
              <div className="flex gap-3 items-stretch">
                <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="jp-section-title">本日の売れ筋ランキング</h2>
                      <p className="text-sm text-muted-foreground -mt-2 ml-4">{new Date().toLocaleDateString("ja-JP")} 集計</p>
                    </div>
                    <a href="/search?sort=popular" className="flex items-center text-sm text-primary hover:underline">
                      もっと見る
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </a>
                  </div>
                  <PopularRankingSwiper products={todayBestProducts} />
                </div>
                {!timeSaleLoading && timeSaleProducts && timeSaleProducts.length > 0 && (
                  <TimeSaleSideColumn products={timeSaleProducts} />
                )}
              </div>
            </div>
          </section>
        )}

        {/* 2. Quick links */}
        <section className="py-2">
          <div className="container">
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              <a href="/ranking" className="jp-card p-2 md:p-3 flex flex-col md:flex-row items-center gap-1 md:gap-3 hover:border-primary/50 transition-colors text-center md:text-left">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm">ヒット商品</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">人気売れ筋</p>
                </div>
              </a>
              <a href="/new-arrivals" className="jp-card p-2 md:p-3 flex flex-col md:flex-row items-center gap-1 md:gap-3 hover:border-primary/50 transition-colors text-center md:text-left">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm">新着商品</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">新しいアイテム</p>
                </div>
              </a>
              <a href="/recommended" className="jp-card p-2 md:p-3 flex flex-col md:flex-row items-center gap-1 md:gap-3 hover:border-primary/50 transition-colors text-center md:text-left">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <ThumbsUp className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm">おすすめ商品</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">スタッフ厳選</p>
                </div>
              </a>
              <a href="/sale" className="jp-card p-2 md:p-3 flex flex-col md:flex-row items-center gap-1 md:gap-3 hover:border-primary/50 transition-colors text-center md:text-left">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-xs md:text-sm">セール商品</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground hidden md:block">お得な特価品</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ===== 메인 콘텐츠 (사이드바 없이 전체 너비) ===== */}
        <div className="container py-4">
          <div className="flex gap-4 items-start">

            {/* ===== 메인 콘텐츠 ===== */}
            <div className="flex-1 min-w-0 space-y-0">

              {/* Weekly Best Banner */}
              <div className="mb-2">
                <WeeklyBestBanner />
              </div>

              {/* HIT 売れ筋商品 */}
              {(hitProductsLoading || (hitProducts && hitProducts.length > 0)) && (
                <div className="bg-amber-50/40 rounded-lg overflow-hidden mb-2">
                  <ProductSection
                    title="koreamall24 の売れ筋商品"
                    subtitle="お客様に人気の定番商品をご紹介します"
                    products={hitProducts}
                    isLoading={hitProductsLoading}
                    moreLink="/search?sort=popular"
                    columns={4}
                    badgeType="hit"
                  />
                </div>
              )}

              {/* New Arrivals */}
              {(newArrivalLoading || (newArrivalProducts && newArrivalProducts.length > 0)) && (
                <div className="bg-blue-50/30 rounded-lg overflow-hidden mb-2">
                  <ProductSection
                    title="新着商品"
                    subtitle="新しく入荷した商品をご紹介します"
                    products={newArrivalProducts.slice(0, 10)}
                    isLoading={newArrivalLoading}
                    moreLink="/search?sort=newest"
                    columns={5}
                    badgeType="new"
                  />
                </div>
              )}

              {/* おすすめ商品 */}
              {!recommendedLoading && recommendedProducts && recommendedProducts.length > 0 && (
                <div className="bg-purple-50/30 rounded-lg overflow-hidden mb-2">
                  <HorizontalProductSection
                    title="おすすめ商品"
                    subtitle="スタッフが厳選したおすすめ商品をご紹介します"
                    products={recommendedProducts}
                    moreLink="/search?sort=popular"
                    columns={3}
                  />
                </div>
              )}

              {/* AI Personalized Recommendations */}
              <div className="mb-2">
                <PersonalizedRecommendations />
              </div>

              {/* Time Sale */}
              {!timeSaleLoading && timeSaleProducts && timeSaleProducts.length > 0 && (
                <div className="bg-red-50/50 rounded-lg overflow-hidden mb-2">
                  <HorizontalProductSection
                    title="タイムセール"
                    subtitle="期間限定！お見逃しなく"
                    products={timeSaleProducts}
                    moreLink="/search?q=タイムセール&sort=discount"
                    columns={3}
                  />
                </div>
              )}

              {/* Monthly Sale */}
              {!monthlySaleLoading && monthlySaleProducts && monthlySaleProducts.length > 0 && (
                <div className="bg-green-50/50 rounded-lg overflow-hidden mb-2">
                  <HorizontalProductSection
                    title="今月限定セール"
                    subtitle="季節にあった人気商品をピック！"
                    products={monthlySaleProducts}
                    moreLink="/search?q=月間セール&sort=discount"
                    columns={3}
                  />
                </div>
              )}

              {/* Staff Recommended */}
              <div className="mb-2">
                <StaffRecommendedProducts />
              </div>

              {/* Info banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">100%</p>
                    <p className="text-sm text-muted-foreground">正規品保証</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">24時間</p>
                    <p className="text-sm text-muted-foreground">受付対応</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">全品</p>
                    <p className="text-sm text-muted-foreground">送料無料</p>
                  </div>
                </div>
              </div>

              {/* Latest Reviews */}
              <div className="mb-4">
                <LatestReviews />
              </div>

              {/* Bottom info boxes (공지/문의) - 모바일에서만 표시, PC는 사이드바에 있음 */}
              <div className="lg:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  {/* Announcements Box */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">お知らせ</h3>
                    </div>
                    <div className="flex-1 flex flex-col">
                      {latestAnnouncements.length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="flex-1 space-y-0">
                            {latestAnnouncements.slice(0, 3).map((announcement: any, idx: number) => (
                              <a key={idx} href="/bbs/notice" className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0 hover:text-blue-600 transition-colors group">
                                <p className="text-sm font-medium line-clamp-1 flex-1 pr-2 text-gray-800 group-hover:text-blue-600">{announcement.titleJa}</p>
                                <p className="text-xs text-gray-400 flex-shrink-0">
                                  {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" }) : ""}
                                </p>
                              </a>
                            ))}
                          </div>
                          <div className="pt-3 mt-auto">
                            <a href="/bbs/notice" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium">すべて見る →</a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-sm text-gray-400">公知事項はまだありません</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inquiry Box */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">お問い合わせ</h3>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <p className="text-sm text-gray-600 mb-4">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
                      <a href="/bbs/inquiry/create" className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                        お問い合わせはこちら →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
