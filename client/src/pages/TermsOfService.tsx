import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

const articles = [
  {
    number: "1",
    title: "適用",
    content:
      "本利用規約（以下「本規約」）は、koreamall24（以下「当社」）が運営するkoreamall24（以下「本サービス」）の利用条件を定めるものです。本規約は、本サービスの利用に関して、当社とお客様との間に適用されます。お客様が本サービスを利用した時点で、本規約に同意したものとみなします。",
  },
  {
    number: "2",
    title: "個人輸入の性質",
    content:
      "本サービスは、お客様個人の使用を目的とした医薬品の個人輸入代行サービスです。以下の事項をご理解・ご承諾の上、ご利用ください。",
    list: [
      "医薬品の個人輸入は、輸入者自身の個人的な使用を目的とする範囲でのみ認められています。",
      "第三者への転売・譲渡は薬機法により禁止されています。",
      "輸入した医薬品は、日本国内の薬事承認を受けていない場合があります。",
      "医師の指示なく医薬品を使用することによるリスクはお客様自身が負うものとします。",
    ],
  },
  {
    number: "3",
    title: "会員登録",
    content:
      "本サービスの一部機能は、会員登録が必要です。会員登録の際は、正確な情報を入力してください。虚偽の情報を登録した場合、当社はアカウントを停止することがあります。",
  },
  {
    number: "4",
    title: "禁止事項",
    content: "お客様は、本サービスの利用にあたり、以下の行為を行ってはなりません。",
    list: [
      "法令または公序良俗に違反する行為",
      "購入した医薬品の第三者への転売・譲渡",
      "当社または第三者の知的財産権を侵害する行為",
      "本サービスの運営を妨害する行為",
      "他のお客様への迷惑行為",
      "不正アクセスその他の不正行為",
    ],
  },
  {
    number: "5",
    title: "注文・決済",
    content:
      "ご注文は、お客様が注文を確定した時点で成立します。決済はクレジットカードにより行われ、注文確定後にご請求されます。",
  },
  {
    number: "6",
    title: "返品・キャンセル",
    content:
      "商品到着後7日以内に未開封の状態でご連絡いただいた場合に限り、返品・交換を承ります。医薬品の性質上、開封済み商品の返品はお受けできません。なお、お客様都合による返品の場合、返送料はお客様のご負担となります。",
  },
  {
    number: "7",
    title: "免責事項",
    content:
      "当社は、本サービスを通じて購入した医薬品の使用による効果・副作用等について、法令の定める範囲を超えた責任を負いません。医薬品の使用に際しては、必ず添付文書をよく読み、用法・用量を守ってご使用ください。",
  },
  {
    number: "8",
    title: "サービスの変更・終了",
    content:
      "当社は、お客様への事前通知なく、本サービスの内容を変更または終了することがあります。",
  },
  {
    number: "9",
    title: "準拠法・管轄裁判所",
    content:
      "本規約は日本法に準拠し、本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Page header */}
      <div className="border-b border-gray-300 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">ホーム</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700">利用規約</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">利用規約</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Intro */}
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          本利用規約をよくお読みいただき、同意の上でkoreamall24をご利用ください。本サービスをご利用いただいた時点で、本規約に同意したものとみなします。
        </p>

        {/* Articles */}
        <div className="space-y-6">
          {articles.map((article) => (
            <div key={article.number} className="border border-gray-300">
              {/* Article title */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-tight">
                  第{article.number}条　{article.title}
                </h2>
              </div>
              {/* Article body */}
              <div className="px-5 py-4 text-sm text-gray-800 leading-relaxed">
                <p className={article.list ? "mb-3" : ""}>{article.content}</p>
                {article.list && (
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-gray-700">
                    {article.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="mt-8 text-xs text-gray-500 text-right space-y-0.5">
          <p>制定日：2024年1月1日</p>
          <p>最終改定日：2025年4月1日</p>
        </div>

        {/* Bottom links */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/legal-notice" className="text-primary hover:underline font-medium">
            → 特定商取引法に基づく表記
          </Link>
          <Link href="/privacy-policy" className="text-primary hover:underline font-medium">
            → プライバシーポリシー
          </Link>
          <Link href="/contact" className="text-primary hover:underline font-medium">
            → お問い合わせ
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
