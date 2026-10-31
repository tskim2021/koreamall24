import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Scissors,
  Sparkles,
  Scale,
  Heart,
  Moon,
  Brain,
  Shield,
  PawPrint,
  Pill,
  Zap,
  Droplet,
  Flower2,
  Dumbbell,
  AlertCircle,
  Wind,
  Leaf,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Scissors,
  Sparkles,
  Scale,
  Heart,
  Moon,
  Brain,
  Shield,
  PawPrint,
  Pill,
  Zap,
  Droplet,
  Flower2,
  Dumbbell,
  AlertCircle,
  Wind,
  Leaf,
};

interface CategoryStyle {
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBg: string;
}

// 카테고리별 아이콘 및 색상 매핑
const getCategoryStyle = (categoryName: string): CategoryStyle => {
  const name = categoryName.toLowerCase();
  
  if (name.includes("美容") || name.includes("スキンケア") || name.includes("ニキビ")) 
    return { icon: "Sparkles", bgColor: "bg-pink-100", textColor: "text-pink-600", borderColor: "border-pink-300", hoverBg: "hover:bg-pink-200" };
  
  if (name.includes("AGA") || name.includes("薄毛")) 
    return { icon: "Leaf", bgColor: "bg-green-100", textColor: "text-green-600", borderColor: "border-green-300", hoverBg: "hover:bg-green-200" };
  
  if (name.includes("男性") || name.includes("ED")) 
    return { icon: "Dumbbell", bgColor: "bg-blue-100", textColor: "text-blue-600", borderColor: "border-blue-300", hoverBg: "hover:bg-blue-200" };
  
  if (name.includes("健康")) 
    return { icon: "Heart", bgColor: "bg-red-100", textColor: "text-red-600", borderColor: "border-red-300", hoverBg: "hover:bg-red-200" };
  
  if (name.includes("ダイエット")) 
    return { icon: "Scale", bgColor: "bg-purple-100", textColor: "text-purple-600", borderColor: "border-purple-300", hoverBg: "hover:bg-purple-200" };
  
  if (name.includes("スマート") || name.includes("ドラッグ")) 
    return { icon: "Zap", bgColor: "bg-yellow-100", textColor: "text-yellow-600", borderColor: "border-yellow-300", hoverBg: "hover:bg-yellow-200" };
  
  if (name.includes("性病") || name.includes("感染症") || name.includes("抗生剤")) 
    return { icon: "Shield", bgColor: "bg-orange-100", textColor: "text-orange-600", borderColor: "border-orange-300", hoverBg: "hover:bg-orange-200" };
  
  if (name.includes("ピル")) 
    return { icon: "Pill", bgColor: "bg-indigo-100", textColor: "text-indigo-600", borderColor: "border-indigo-300", hoverBg: "hover:bg-indigo-200" };
  
  if (name.includes("睡眠") || name.includes("メンタル")) 
    return { icon: "Moon", bgColor: "bg-slate-100", textColor: "text-slate-600", borderColor: "border-slate-300", hoverBg: "hover:bg-slate-200" };
  
  if (name.includes("女性")) 
    return { icon: "Flower2", bgColor: "bg-rose-100", textColor: "text-rose-600", borderColor: "border-rose-300", hoverBg: "hover:bg-rose-200" };
  
  if (name.includes("ジェネリック")) 
    return { icon: "Droplet", bgColor: "bg-cyan-100", textColor: "text-cyan-600", borderColor: "border-cyan-300", hoverBg: "hover:bg-cyan-200" };
  
  if (name.includes("ステロイド") || name.includes("アナボリック")) 
    return { icon: "Dumbbell", bgColor: "bg-amber-100", textColor: "text-amber-600", borderColor: "border-amber-300", hoverBg: "hover:bg-amber-200" };
  
  return { icon: "Heart", bgColor: "bg-gray-100", textColor: "text-gray-600", borderColor: "border-gray-300", hoverBg: "hover:bg-gray-200" };
};

interface CategoryGridProps {
  sidebarMode?: boolean;
}

export default function CategoryGrid({ sidebarMode = false }: CategoryGridProps) {
  const _catInitial = typeof window !== "undefined" ? (window as any).__INITIAL_DATA__?.categories : undefined;
  const { data: categories, isLoading } = trpc.category.list.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, ...(_catInitial ? { initialData: _catInitial } : {}) }
  );

  if (isLoading) {
    if (sidebarMode) {
      return (
        <div className="p-2 space-y-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      );
    }
    return (
      <section className="py-4 md:py-6">
        <div className="container px-2 md:px-4">
          <h2 className="jp-section-title text-base md:text-lg">カテゴリーから探す</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 md:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="jp-card p-2 md:p-4 animate-pulse">
                <div className="w-6 md:w-8 h-6 md:h-8 bg-gray-200 rounded-full mx-auto mb-1 md:mb-2"></div>
                <div className="h-2 md:h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 사이드바 모드: 3번 캡처 스타일 (아이콘 + 텍스트 + 오른쪽 화살표)
  if (sidebarMode) {
    return (
      <nav>
        {categories?.map((category, index) => {
          const style = getCategoryStyle(category.nameJa);
          const Icon = iconMap[style.icon] || Heart;
          return (
            <React.Fragment key={category.id}>
              {index > 0 && <hr className="border-0 border-t border-gray-100 mx-3" />}
              <Link href={`/category/${category.slug}`}>
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${style.textColor}`} />
                  <span className="flex-1 leading-tight line-clamp-1 text-[13px]">{category.nameJa}</span>
                  <span className="text-gray-400 text-xs group-hover:text-gray-600 transition-colors">›</span>
                </div>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  return (
    <section className="py-4 md:py-6">
      <div className="container px-2 md:px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="jp-section-title text-base md:text-lg !mb-0">カテゴリーから探す</h2>
          <Link href="/ranking" className="text-xs md:text-sm text-primary hover:underline shrink-0">もっと見る</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2 md:gap-3">
          {categories?.map((category) => {
            const style = getCategoryStyle(category.nameJa);
            const Icon = iconMap[style.icon] || Heart;
            return (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <div className={`jp-card p-1.5 md:p-3 text-center border transition-colors group ${style.borderColor} ${style.hoverBg}`}>
                  <div className={`w-8 md:w-12 h-8 md:h-12 mx-auto mb-1 md:mb-2 rounded-full ${style.bgColor} flex items-center justify-center group-hover:shadow-md transition-all`}>
                    <Icon className={`w-4 md:w-6 h-4 md:h-6 ${style.textColor}`} />
                  </div>
                  <p className="text-xs font-medium truncate line-clamp-2">{category.nameJa}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
