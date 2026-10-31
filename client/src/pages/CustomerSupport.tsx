import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { MessageCircle, FileQuestion, Phone, Mail, ChevronRight, HelpCircle, BookOpen, Clock } from "lucide-react";

export default function CustomerSupport() {
  const supportMenus = [
    {
      icon: <MessageCircle className="w-8 h-8 text-green-500" />,
      title: "LINEで相談",
      description: "LINEで気軽にご相談いただけます。スタッフが丁寧にお答えします。",
      href: "https://line.me/ti/p/~@cocokusuri",
      external: true,
      badge: "おすすめ",
      badgeColor: "bg-green-500",
    },
    {
      icon: <FileQuestion className="w-8 h-8 text-blue-500" />,
      title: "お問い合わせフォーム",
      description: "ご質問・ご要望はこちらのフォームからお気軽にお送りください。",
      href: "/mypage/inquiries",
      external: false,
    },
    {
      icon: <BookOpen className="w-8 h-8 text-purple-500" />,
      title: "よくある質問（FAQ）",
      description: "よくいただくご質問とその回答をまとめています。まずこちらをご確認ください。",
      href: "/faq",
      external: false,
    },
    {
      icon: <HelpCircle className="w-8 h-8 text-orange-500" />,
      title: "お知らせ・重要なお知らせ",
      description: "サービスに関する最新のお知らせや重要な情報をご確認いただけます。",
      href: "/bbs/notice",
      external: false,
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-primary" />,
      title: "お問い合わせ履歴",
      description: "過去のお問い合わせ内容と回答をご確認いただけます。",
      href: "/mypage/inquiries",
      external: false,
    },
  ];

  const faqItems = [
    {
      q: "注文後のキャンセルはできますか？",
      a: "発送前であればキャンセル可能です。お問い合わせフォームよりご連絡ください。",
    },
    {
      q: "配送にはどのくらいかかりますか？",
      a: "通常3〜7営業日でお届けします。時期によって異なる場合があります。",
    },
    {
      q: "返品・交換はできますか？",
      a: "商品到着後7日以内であれば、未開封・未使用の商品に限り返品・交換を承ります。",
    },
    {
      q: "支払い方法を教えてください。",
      a: "クレジットカード（VISA・Mastercard・JCB等）でのお支払いに対応しています。",
    },
    {
      q: "会員登録は必要ですか？",
      a: "会員登録なしでもご購入いただけますが、会員登録でポイント獲得などの特典があります。",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title="カスタマーサポート"
        description="koreamall24のカスタマーサポートページです。お問い合わせ、よくある質問、LINEサポートなどをご利用いただけます。"
        keywords="カスタマーサポート, お問い合わせ, FAQ, よくある質問, LINE相談"
        ogType="website"
      />
      <Header />
      <main className="flex-1">
        {/* ページヘッダー */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-10">
          <div className="container text-center">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <h1 className="text-3xl font-bold mb-2">カスタマーサポート</h1>
            <p className="text-white/80">お気軽にお問い合わせください。スタッフが丁寧にサポートします。</p>
            <div className="flex items-center justify-center gap-2 mt-3 text-white/70 text-sm">
              <Clock className="w-4 h-4" />
              <span>受付時間：24時間受付中</span>
            </div>
          </div>
        </div>

        <div className="container py-10 max-w-4xl">
          {/* サポートメニュー */}
          <h2 className="text-xl font-bold mb-5">サポートメニュー</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {supportMenus.map((menu, index) => (
              menu.external ? (
                <a
                  key={index}
                  href={menu.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow border border-gray-100 group"
                >
                  <div className="shrink-0">{menu.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{menu.title}</span>
                      {menu.badge && (
                        <span className={`${menu.badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>{menu.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{menu.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary shrink-0 mt-0.5" />
                </a>
              ) : (
                <Link
                  key={index}
                  href={menu.href}
                  className="bg-white rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow border border-gray-100 group"
                >
                  <div className="shrink-0">{menu.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{menu.title}</span>
                      {menu.badge && (
                        <span className={`${menu.badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>{menu.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{menu.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary shrink-0 mt-0.5" />
                </Link>
              )
            ))}
          </div>

          {/* よくある質問 */}
          <h2 className="text-xl font-bold mb-5">よくある質問</h2>
          <div className="space-y-3 mb-10">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-start gap-3 mb-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">Q</span>
                  <p className="font-semibold text-gray-800">{item.q}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">A</span>
                  <p className="text-gray-600 text-sm">{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/faq" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              すべてのFAQを見る <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
