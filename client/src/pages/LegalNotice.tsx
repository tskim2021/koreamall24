import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

const legalRows = [
  {
    label: "販売業者",
    value: "koreamall24",
  },
  {
    label: "運営責任者",
    value: "高橋 悠介",
  },
  {
    label: "所在地",
    value: "Rm 901&902 9/F Taurus Bldg 21A&B Granville Road Tsim Sha Tsui KL",
  },
  {
    label: "メールアドレス",
    value: "support@cocokusuri.com",
    href: "mailto:support@cocokusuri.com",
  },
  {
    label: "販売URL",
    value: "https://koreamall24.com",
    href: "https://koreamall24.com",
  },
  {
    label: "商品代金以外の必要料金",
    value: "全商品送料無料（消費税込み）",
  },
  {
    label: "お支払い方法",
    value: "クレジットカード決済（VISA・Mastercard・JCB・American Express）",
  },
  {
    label: "商品の引渡時期",
    value: "ご注文確認後、3〜7営業日以内に発送いたします。\n※海外からの発送となるため、お届けまでに7〜21日程度かかる場合がございます。",
  },
  {
    label: "返品・交換について",
    value: "商品到着後7日以内にご連絡ください。未開封の商品に限り返品・交換を承ります。\nただし、お客様都合による返品の場合、返送料はお客様のご負担となります。\n医薬品の性質上、開封済み商品の返品・交換はお受けできません。",
  },
  {
    label: "個人輸入について",
    value: "当サイトで取り扱う医薬品は、お客様個人の使用を目的とした個人輸入代行サービスです。\n医薬品の個人輸入は、輸入者自身の個人的な使用を目的とする範囲でのみ認められています。\n第三者への転売・譲渡は法律により禁止されています。",
  },
];

export default function LegalNotice() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Page header */}
      <div className="border-b border-gray-300 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:underline">ホーム</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700">特定商取引法に基づく表記</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">特定商取引法に基づく表記</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        {/* Intro text */}
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          特定商取引に関する法律第11条（通信販売についての広告）に基づき、以下の通り表示いたします。
        </p>

        {/* Table */}
        <div className="border border-gray-300">
          {/* Desktop: table layout / Mobile: block layout */}
          <table className="hidden md:table w-full text-sm border-collapse">
            <tbody>
              {legalRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                  <th
                    className="w-44 min-w-[160px] px-4 py-4 text-left font-semibold text-gray-700 bg-gray-50 border-r border-gray-300 align-top leading-relaxed"
                    scope="row"
                  >
                    {row.label}
                  </th>
                  <td className="px-5 py-4 text-gray-800 align-top leading-relaxed">
                    {row.href ? (
                      <a
                        href={row.href}
                        className="text-primary hover:underline break-all"
                        target={row.href.startsWith("http") ? "_blank" : undefined}
                        rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="whitespace-pre-line">{row.value}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Mobile block layout */}
          <div className="md:hidden divide-y divide-gray-300">
            {legalRows.map((row, idx) => (
              <div key={idx} className="text-sm">
                <div className="px-4 py-2.5 font-semibold text-gray-700 bg-gray-50 text-xs">{row.label}</div>
                <div className="px-4 py-3 text-gray-800 leading-relaxed">
                  {row.href ? (
                    <a
                      href={row.href}
                      className="text-primary hover:underline break-all"
                      target={row.href.startsWith("http") ? "_blank" : undefined}
                      rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span className="whitespace-pre-line">{row.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="mt-8 border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
          <p className="text-xs font-bold text-amber-800 mb-1">【個人輸入に関するご注意】</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            当サイトで販売している商品は、日本の薬機法上の承認を受けていない場合があります。
            個人輸入された医薬品は、日本国内の医薬品と品質・安全性が異なる場合があります。
            ご利用の際は、必ず医師・薬剤師にご相談ください。
          </p>
        </div>

        {/* Bottom links */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/contact" className="text-primary hover:underline font-medium">
            → お問い合わせ
          </Link>
          <Link href="/first-time-customer" className="text-primary hover:underline font-medium">
            → はじめてのお客様へ
          </Link>
          <Link href="/privacy-policy" className="text-primary hover:underline font-medium">
            → プライバシーポリシー
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
