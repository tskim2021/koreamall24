import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

interface MyPageLayoutProps {
  children: React.ReactNode;
  /** ページタイトル（ヘッダー部分に表示） */
  title: string;
  /** サブタイトル（任意） */
  subtitle?: string;
  /** パンくずリスト用の前ページリンク（任意） */
  backHref?: string;
  backLabel?: string;
  /** タイトル右側に表示するアクションボタン等（任意） */
  headerAction?: React.ReactNode;
}

export default function MyPageLayout({
  children,
  title,
  subtitle,
  backHref,
  backLabel,
  headerAction,
}: MyPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb / back link */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/mypage">
              <span className="hover:text-primary cursor-pointer transition-colors">マイページ</span>
            </Link>
            {backHref && backLabel && (
              <>
                <span>/</span>
                <Link href={backHref}>
                  <span className="hover:text-primary cursor-pointer transition-colors">{backLabel}</span>
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-800 font-medium">{title}</span>
          </div>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-52 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Page header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {headerAction && <div>{headerAction}</div>}
              </div>

              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
