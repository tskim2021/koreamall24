import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

const sections = [
  {
    number: "1",
    title: "収集する個人情報",
    content: "koreamall24（以下「当社」）は、サービス提供のために以下の個人情報を収集することがあります。",
    list: [
      "氏名、住所、電話番号、メールアドレス等の連絡先情報",
      "クレジットカード情報等の決済情報（当社サーバーには保存せず、決済代行会社が管理）",
      "購入履歴、閲覧履歴等のサービス利用情報",
      "IPアドレス、Cookie情報等のアクセスログ",
    ],
  },
  {
    number: "2",
    title: "個人情報の利用目的",
    content: "収集した個人情報は、以下の目的のために利用します。",
    list: [
      "商品の注文処理・発送・配送状況のご連絡",
      "お問い合わせへの対応",
      "サービスの改善・新サービスの開発",
      "キャンペーン・お得な情報のご案内（メールマガジン等）",
      "不正利用の防止・セキュリティ確保",
    ],
  },
  {
    number: "3",
    title: "個人情報の第三者提供",
    content: "当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。",
    list: [
      "お客様の同意がある場合",
      "法令に基づく場合",
      "人の生命・身体・財産の保護のために必要な場合",
      "公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合",
      "国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合",
    ],
  },
  {
    number: "4",
    title: "個人情報の管理",
    content: "当社は、お客様の個人情報を正確かつ最新の状態に保ち、個人情報への不正アクセス・紛失・破損・改ざん・漏洩などを防止するため、セキュリティシステムの維持・管理体制の整備・社員教育の徹底等の必要な措置を講じ、安全対策を実施し個人情報の厳重な管理を行います。",
  },
  {
    number: "5",
    title: "Cookieの使用について",
    content: "当サイトでは、サービス向上のためCookieを使用しています。Cookieとは、ウェブサイトがお客様のコンピュータに送信する小さなデータファイルです。お客様はブラウザの設定によりCookieの受け取りを拒否することができますが、その場合一部のサービスがご利用いただけない場合があります。",
  },
  {
    number: "6",
    title: "個人情報の開示・訂正・削除",
    content: "お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除を請求することができます。ご請求の際は、下記お問い合わせ先までご連絡ください。本人確認のうえ、合理的な期間内に対応いたします。",
  },
  {
    number: "7",
    title: "プライバシーポリシーの変更",
    content: "当社は、法令の変更や事業内容の変化に応じて、本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、当サイトに掲載した時点から効力を生じるものとします。",
  },
  {
    number: "8",
    title: "お問い合わせ",
    content: "個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。",
    contact: {
      company: "koreamall24",
      manager: "高橋 悠介",
      email: "support@cocokusuri.com",
      url: "https://koreamall24.com",
    },
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Page header */}
      <div className="border-b border-gray-300 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">ホーム</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700">プライバシーポリシー</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">プライバシーポリシー</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Intro */}
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          koreamall24（以下「当社」）は、お客様の個人情報の保護を重要な責務と認識し、以下のプライバシーポリシーに基づき、個人情報を適切に取り扱います。
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.number} className="border border-gray-300">
              {/* Section title */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">
                  第{section.number}条　{section.title}
                </h2>
              </div>
              {/* Section body */}
              <div className="px-5 py-4 text-sm text-gray-800 leading-relaxed">
                <p className="mb-3">{section.content}</p>
                {section.list && (
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-gray-700">
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                )}
                {section.contact && (
                  <div className="mt-3 border border-gray-200 divide-y divide-gray-200 text-sm">
                    {[
                      { label: "販売業者", content: <span className="text-gray-800">{section.contact.company}</span> },
                      { label: "担当者", content: <span className="text-gray-800">{section.contact.manager}</span> },
                      { label: "メール", content: <a href={`mailto:${section.contact.email}`} className="text-primary hover:underline break-all">{section.contact.email}</a> },
                      { label: "URL", content: <a href={section.contact.url} className="text-primary hover:underline break-all" target="_blank" rel="noopener noreferrer">{section.contact.url}</a> },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col sm:flex-row">
                        <div className="sm:w-28 px-3 py-2 font-semibold text-gray-600 bg-gray-50 sm:border-r border-b sm:border-b-0 border-gray-200 shrink-0">{item.label}</div>
                        <div className="px-3 py-2">{item.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Effective date */}
        <p className="mt-8 text-xs text-gray-500 text-right">制定日：2024年1月1日</p>

        {/* Bottom links */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/contact" className="text-primary hover:underline font-medium">
            → お問い合わせ
          </Link>
          <Link href="/legal-notice" className="text-primary hover:underline font-medium">
            → 特定商取引法に基づく表記
          </Link>
          <Link href="/first-time-customer" className="text-primary hover:underline font-medium">
            → はじめてのお客様へ
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
