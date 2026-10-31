import { trpc } from "@/lib/trpc";
import { getOptimizedSrc } from "@/lib/imageProxy";

const STALE_30MIN = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 };

// Qoo10-style dedicated ad banner column, sitting beside (not stacked on top of)
// the category sidebar next to the hero.
export default function HeroAdColumn() {
  const { data: banners = [], isLoading } = trpc.banner.listByType.useQuery(
    { bannerType: "sidebar_top" },
    STALE_30MIN
  );

  if (isLoading || banners.length === 0) return null;

  return (
    <div className="hidden xl:block w-[140px] shrink-0 self-start">
      <div className="space-y-2">
        {banners.map((banner: any) => (
          banner.linkUrl ? (
            <a key={banner.id} href={banner.linkUrl} className="block rounded-lg overflow-hidden shadow-sm hover:opacity-90 transition-opacity">
              <img src={getOptimizedSrc(banner.imageUrl, 280, 280)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-contain" />
            </a>
          ) : (
            <div key={banner.id} className="block rounded-lg overflow-hidden shadow-sm">
              <img src={getOptimizedSrc(banner.imageUrl, 280, 280)} alt={banner.titleJa || banner.title} loading="lazy" decoding="async" className="w-full h-auto object-contain" />
            </div>
          )
        ))}
      </div>
    </div>
  );
}
