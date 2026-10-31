import { Link } from "wouter";
import { ChevronUp, Mail, Clock, Truck, Shield, CreditCard, UserPlus } from "lucide-react";
import { trpc } from "../lib/trpc";

export default function Footer() {
  const { data: categories = [] } = trpc.category.list.useQuery();
  const { data: brandSettings } = trpc.admin.siteSettings.getBrandSettings.useQuery();
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Split categories into columns (first 8 in first column, rest in second)
  const firstColumnCategories = categories.slice(0, 8);
  const secondColumnCategories = categories.slice(8);

  return (
    <footer className="bg-secondary/30 border-t mt-auto">
      {/* Features bar */}
      <div className="bg-primary/5 py-4 border-b" style={{marginTop: '0px'}}>
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-5 h-5 text-primary" />
              <span>送料無料</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-5 h-5 text-primary" />
              <span>安心の品質保証</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>各種カード対応</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-5 h-5 text-primary" />
              <span>24時間受付</span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to top */}
      <div className="border-b">
        <button
          onClick={scrollToTop}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors bg-background/50"
        >
          ページトップへ
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Main footer content */}
      <div className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* キャンペーン・商品 */}
          <div>
            <h3 className="font-bold text-sm mb-4 text-foreground">キャンペーン・商品</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/ranking" className="hover:text-primary transition-colors">
                  売れ筋ランキングTOP100
                </Link>
              </li>
              <li>
                <Link href="/new-arrivals" className="hover:text-primary transition-colors">
                  新着商品
                </Link>
              </li>
              <li>
                <Link href="/recommended" className="hover:text-primary transition-colors">
                  おすすめ商品
                </Link>
              </li>
              <li>
                <Link href="/sale" className="hover:text-primary transition-colors">
                  セール商品
                </Link>
              </li>
            </ul>
          </div>

          {/* カテゴリ */}
          <div>
            <h3 className="font-bold text-sm mb-4 text-foreground">カテゴリ</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {firstColumnCategories.map((category) => (
                <li key={category.id}>
                  <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">
                    {category.nameJa}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* カテゴリ続き */}
          {secondColumnCategories.length > 0 && (
            <div className="hidden lg:block">
              <h3 className="font-bold text-sm mb-4 text-foreground">&nbsp;</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {secondColumnCategories.map((category) => (
                  <li key={category.id}>
                    <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">
                      {category.nameJa}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ご利用ガイド */}
          <div>
            <h3 className="font-bold text-sm mb-4 text-foreground">ご利用ガイド</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/first-time-customer" className="hover:text-primary transition-colors">
                  はじめてのお客様へ
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary transition-colors">
                  よくある質問（FAQ）
                </Link>
              </li>
              <li>
                <Link href="/medicine-import" className="hover:text-primary transition-colors">
                  お薬の個人輸入
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="hover:text-primary transition-colors">
                  返品・交換ポリシー
                </Link>
              </li>
              <li>
                <Link href="/international-shipping" className="hover:text-primary transition-colors">
                  安心・安全な国際配送
                </Link>
              </li>
              <li>
                <Link href="/bbs/notice" className="hover:text-primary transition-colors">
                  お知らせ一覧
                </Link>
              </li>
            </ul>
          </div>

          {/* サービス */}
          <div>
            <h3 className="font-bold text-sm mb-4 text-foreground">サービス</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/mypage/points" className="hover:text-primary transition-colors">
                  ポイント
                </Link>
              </li>
              <li>
                <Link href="/bbs/event" className="hover:text-primary transition-colors">
                  イベント
                </Link>
              </li>
              <li>
                <Link href="/mypage/inquiries" className="hover:text-primary transition-colors">
                  お問い合わせ
                </Link>
              </li>
              <li>
                <Link href="/review" className="hover:text-primary transition-colors">
                  レビュー
                </Link>
              </li>
              <li>
                <Link href="/mypage/wishlist" className="hover:text-primary transition-colors">
                  お気に入り一覧
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal links bar */}
      <div className="border-t border-b">
        <div className="container py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs text-muted-foreground">
            <Link href="/mypage/inquiries" className="hover:text-primary transition-colors">
              お問い合わせ
            </Link>
            <span className="hidden md:inline text-border">|</span>
            <Link href="/legal-notice" className="hover:text-primary transition-colors">
              特定商取引法に基づく表記
            </Link>
            <span className="hidden md:inline text-border">|</span>
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">
              プライバシーポリシー
            </Link>
            <span className="hidden md:inline text-border">|</span>
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">
              利用規約
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom section with logo and description */}
      <div className="container py-8">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {brandSettings?.footerLogoPC ? (
                <img src={brandSettings.footerLogoPC} alt="ロゴ" className="h-10 max-w-[160px] object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">く</span>
                  </div>
                  <span className="text-xl font-bold text-primary">koreamall24</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                お薬・サプリメントの個人輸入代行koreamall24が、お客様の個人情報を厳格に管理し、100%正規品の医薬品をご自宅または郵便局留めにてお届けします！
              </p>
              <p>
                格安で処方箋不要！ED薬・ピル・ダイエット薬・育毛剤など定番から、まつ毛育毛剤・性病薬まで、世界のあらゆる医薬品をkoreamall24で通販いただけます。
              </p>
              <p className="text-[10px]">
                ※koreamall24で取り扱う医薬品は、全て国外で認可を受けた薬局から出荷されています。
              </p>
              <p className="text-[10px]">
                ※利用者の安全のため、医師の処方箋または指示を伴わない医薬品の使用はお控えください。
              </p>
              <p className="text-[10px]">
                ※医薬品の個人輸入は、輸入者自身の個人的な使用を目的とする範囲でのみ認められています。
              </p>
              <p>
                詳しくは{" "}
                <Link href="/bbs/notice" className="text-primary hover:underline">
                  初めてのお客様へ
                </Link>{" "}
                をご覧ください。
              </p>
            </div>
          </div>

          {/* SNS and contact */}
          <div className="bg-gray-100 rounded-xl p-4" style={{backgroundColor: '#fdfbf7'}}>
            <p className="text-xs text-muted-foreground mb-3">
              ＼ koreamall24を紹介しよう！ ／
            </p>
            <div className="flex gap-3 mb-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-black rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://line.me/ti/p/~@cocokusuri"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#06C755] rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </a>
            </div>

            <div className="flex flex-col gap-1.5">
              <Link
                href="/mypage/inquiries"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-opacity bg-primary w-fit" style={{fontWeight: '400'}}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                1:1お問い合わせ
              </Link>
              <Link
                href="/first-time-customer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-opacity w-fit"
                style={{ backgroundColor: '#7C3AED', fontWeight: '400' }}
              >
                <UserPlus className="w-4 h-4" />
                はじめてのお客様へ
              </Link>
              <a
                href="mailto:support@cocokusuri.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-opacity w-fit" style={{backgroundColor: '#c7c7c7', fontWeight: '400'}}
              >
                <Mail className="w-4 h-4" />
                support@cocokusuri.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t bg-secondary/50">
        <div className="container py-4">
          <p className="text-center text-xs text-muted-foreground">
            © 2026 koreamall24 All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
