import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Package, Truck, CheckCircle, MapPin, CreditCard, Clock, Sparkles, HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function InternationalShipping() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const steps = [
    {
      number: 1,
      title: "ご注文",
      description: "商品をカートに追加してご注文",
      icon: Package,
      details: [
        "欲しい商品をカートに追加します",
        "配送先住所を入力します",
        "支払い方法を選択します",
        "注文を確定します"
      ],
      color: "bg-blue-50 border-blue-200"
    },
    {
      number: 2,
      title: "ご入金",
      description: "お支払い方法に従ってご入金",
      icon: CreditCard,
      details: [
        "クレジットカード、銀行振込など複数の支払い方法に対応",
        "入金確認後、商品の手配を開始します",
        "入金確認メールをお送りします",
        "通常、入金確認から24時間以内に発送準備を開始"
      ],
      color: "bg-green-50 border-green-200"
    },
    {
      number: 3,
      title: "商品の手配・検品",
      description: "商品の確保と品質チェック",
      icon: CheckCircle,
      details: [
        "ご注文いただいた商品を確保します",
        "商品の品質と数量を確認します",
        "商品が正規品であることを確認します",
        "梱包準備を行います"
      ],
      color: "bg-purple-50 border-purple-200"
    },
    {
      number: 4,
      title: "梱包・発送",
      description: "丁寧に梱包して国際配送へ",
      icon: Truck,
      details: [
        "商品を丁寧に梱包します",
        "追跡番号付きで発送します",
        "発送完了メールに追跡番号をお知らせします",
        "DHL、FedEx、EMS等の国際配送業者を利用"
      ],
      color: "bg-orange-50 border-orange-200"
    },
    {
      number: 5,
      title: "国際配送中",
      description: "お客様の国へ配送",
      icon: MapPin,
      details: [
        "追跡番号でリアルタイムに配送状況を確認できます",
        "通常、7～14営業日で配送されます",
        "税関検査が行われる場合があります",
        "配送状況は随時メールでお知らせします"
      ],
      color: "bg-indigo-50 border-indigo-200"
    },
    {
      number: 6,
      title: "配送完了",
      description: "商品がお手元に到着",
      icon: CheckCircle,
      details: [
        "商品がお客様のご住所に配送されます",
        "配送完了メールをお送りします",
        "商品の確認をお願いします",
        "ご不明な点はカスタマーサポートまでお問い合わせください"
      ],
      color: "bg-emerald-50 border-emerald-200"
    }
  ];

  const faqs = [
    {
      question: "お支払い方法は何がありますか？",
      answer: "国際決済対応のVISA・Mastercardなどのクレジットカード、デビットカード、PayPalでのお支払いに対応しています。",
      icon: HelpCircle
    },
    {
      question: "日本への配送費は追加でかかりますか？",
      answer: "日本への配送費は追加で発生しません。ご注文時に表示される配送料金に含まれています。",
      icon: HelpCircle
    },
    {
      question: "関税はかかりますか？",
      answer: "日本への配送の場合、追加の関税・通関料金は発生しません。すべて配送料金に含まれています。",
      icon: AlertCircle
    },
    {
      question: "配送中に商品が破損した場合はどうなりますか？",
      answer: "配送中の破損や配送失敗の場合、koreamall24 がお客様のお手元に到着するまで100%の責任を持って再発送いたします。ただし、国際配送時の箱の凹みやスクラッチは自然発生的な損傷のため、反品・返金の対象外となります。",
      icon: Package
    },
    {
      question: "配送先の住所を変更できますか？",
      answer: "ご注文後、発送前であれば配送先住所を変更できます。カスタマーサポートまでお問い合わせください。",
      icon: MapPin
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-cyan-50 border-b border-primary/10">
        <div className="container max-w-5xl mx-auto py-12 px-4 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            国際配送の流れ
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            安心・安全な<span className="text-primary">国際配送</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            koreamall24 での購入から配送完了までの流れをご説明します。<br />
            世界中のお客様に正規品をお届けしています。
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-12">

        {/* 配送フロー */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">配送の6つのステップ</h2>
              <p className="text-sm text-gray-500">ご注文から配送完了までの流れ</p>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === index;

              return (
                <div key={step.number} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : index)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* ステップ番号 */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                        {step.number}
                      </div>
                    </div>

                    {/* タイトル */}
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>

                    {/* アイコン */}
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />

                    {/* 展開アイコン */}
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* 詳細 */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 配送情報 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">配送情報</h2>
              <p className="text-sm text-gray-500">配送期間・業者・追跡機能について</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="font-bold text-gray-800">配送期間</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                日本へのご注文は、通常<span className="font-bold text-primary">10～14営業日</span>でお届けします。
              </p>
              <p className="text-xs text-gray-500 mb-2">※ 他国への配送はお問い合わせください</p>
              <p className="text-xs text-green-600 font-semibold">✓ 追加配送費用なし</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="font-bold text-gray-800">配送業者</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                日本への配送は日本郵便の国際配送サービスを利用しています。安全で信頼性の高い配送をお約束します。
              </p>
              <p className="text-xs text-gray-500 mb-2">※ 他国への配送についてはお問い合わせください</p>
              <p className="text-xs text-green-600 font-semibold">✓ 100%責任配送</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="font-bold text-gray-800">追跡機能</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                すべての配送に追跡番号が付与され、リアルタイムで配送状況を確認できます。ご注文確認メールに記載されています。
              </p>
              <p className="text-xs text-gray-500">※ 発送完了メールに記載</p>
            </div>
          </div>
        </section>

        {/* よくある質問 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">よくある質問</h2>
              <p className="text-sm text-gray-500">配送に関するご質問にお答えします</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => {
              const Icon = faq.icon;
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-purple-500" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{faq.question}</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">{faq.answer}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 注意事項 */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">配送に関する重要なお知らせ</h3>
              <div className="space-y-2 text-sm text-amber-800">
                <p>• 日本への配送：追加の関税・通関料金は発生しません</p>
                <p>• 配送失敗・破損時：koreamall24 がお客様のお手元に到着するまで100%の責任を持って再発送いたします</p>
                <p>• 箱の凹みやスクラッチ：国際配送時の自然発生的な損傷のため、反品・返金の対象外となります</p>
                <p>• 他国への配送：配送料金や条件についてはカスタマーサポートにお問い合わせください</p>
                <p>• 配送遅延が発生した場合は、メールでお知らせします</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-primary/10 to-blue-100 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">ご不明な点はお気軽にお問い合わせください</h2>
          <div className="space-y-2 mb-6">
            <p className="text-gray-600">
              <span className="font-semibold">AI相談員</span>：24時間対応（自動応答）
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">カスタマーサポート</span>：営業時間中対応
            </p>
            <p className="text-sm text-gray-500">
              他国への配送についても、詳しくはカスタマーサポートにお気軽にご相談ください。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-10">
              <Link href="/mypage/inquiries">
                <HelpCircle className="w-4 h-4 mr-2" />
                お問い合わせ
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-10">
              <Link href="/">
                <ChevronRight className="w-4 h-4 mr-1" />
                ショッピングを続ける
              </Link>
            </Button>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}

export default InternationalShipping;
