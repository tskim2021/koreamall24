import { trpc } from "@/lib/trpc";
import { getOptimizedSrc } from "@/lib/imageProxy";
import CategoryGrid from "@/components/CategoryGrid";
import { Bell } from "lucide-react";

interface HomeSidebarProps {
  compact?: boolean; // true: 카테고리 페이지 - 카테고리 목록 + 상단배너만 표시
  hideTopBanner?: boolean; // true: 상단배너를 별도 칼럼에서 렌더링하므로 여기서는 생략 (qoo10 스타일 2칼럼 구성)
}

const _initialData = typeof window !== "undefined" ? (window as any).__INITIAL_DATA__ : undefined;
const STALE_30MIN = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };
const STALE_10MIN = { staleTime: 10 * 60 * 1000, gcTime: 15 * 60 * 1000 };

export default function HomeSidebar({ compact = false, hideTopBanner = false }: HomeSidebarProps) {
  const { data: sidebarTopBanners = [], isLoading: sidebarTopLoading } = trpc.banner.listByType.useQuery(
    { bannerType: "sidebar_top" },
    STALE_30MIN
  );
  const { data: sidebarBottomBanners = [] } = trpc.banner.listByType.useQuery(
    { bannerType: "sidebar_bottom" },
    STALE_30MIN
  );
  const { data: latestAnnouncements = [] } = trpc.announcements.getAll.useQuery(
    undefined,
    { ..._initialData?.announcements ? { initialData: _initialData.announcements } : {}, ...STALE_10MIN }
  );

  return (
    <aside className="hidden lg:block w-[200px] xl:w-[220px] shrink-0 self-start sticky top-4">
      <div>
        {/* 사이드바 상단 배너 - DB 연동 (로딩 완료 후에만 표시) */}
        {!hideTopBanner && !sidebarTopLoading && sidebarTopBanners.length > 0 && (
          <div className="mb-3 space-y-2">
            {sidebarTopBanners.map((banner: any) => (
              banner.linkUrl ? (
                <a key={banner.id} href={banner.linkUrl} className="block rounded overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
                  <img src={getOptimizedSrc(banner.imageUrl, 220, 80)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
                </a>
              ) : (
                <div key={banner.id} className="block rounded overflow-hidden shadow-sm">
                  <img src={getOptimizedSrc(banner.imageUrl, 220, 80)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
                </div>
              )
            ))}
          </div>
        )}

        {/* 사이드바 - 카테고리 */}
        <div className="bg-white overflow-hidden">
          <CategoryGrid sidebarMode />
        </div>

        {/* 아래 섹션들은 홈에서만 표시 (compact=false) */}
        {!compact && (
          <>
            {/* 공지사항 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mt-4">
              <div className="bg-blue-600 px-4 py-2.5 flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <p className="text-white font-bold text-sm">お知らせ</p>
              </div>
              <div className="p-3">
                {latestAnnouncements.length > 0 ? (
                  <div className="space-y-0">
                    {latestAnnouncements.slice(0, 4).map((announcement: any, idx: number) => (
                      <a
                        key={idx}
                        href="/bbs/notice"
                        className="flex items-start py-2 border-b border-gray-100 last:border-b-0 hover:text-primary transition-colors group"
                      >
                        <p className="text-xs text-gray-700 line-clamp-2 group-hover:text-primary leading-relaxed">{announcement.titleJa}</p>
                      </a>
                    ))}
                    <a href="/bbs/notice" className="block text-xs text-primary hover:underline mt-2 font-medium">
                      すべて見る →
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">お知らせはありません</p>
                )}
              </div>
            </div>

            {/* 사이드바 하단 배너 - DB 연동 */}
            {sidebarBottomBanners.length > 0 && (
              <div className="mt-4 space-y-2">
                {sidebarBottomBanners.map((banner: any) => (
                  banner.linkUrl ? (
                    <a key={banner.id} href={banner.linkUrl} className="block rounded overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
                      <img src={getOptimizedSrc(banner.imageUrl, 220, 80)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
                    </a>
                  ) : (
                    <div key={banner.id} className="block rounded overflow-hidden shadow-sm">
                      <img src={getOptimizedSrc(banner.imageUrl, 220, 80)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
                    </div>
                  )
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
