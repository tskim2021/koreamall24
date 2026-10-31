import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, RotateCcw, CheckCircle, AlertCircle, Clock, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ReturnPolicy() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const returnSteps = [
    {
      number: 1,
      title: "ご連絡",
      description: "返品希望の場合はカスタマーサポートにご連絡",
      icon: AlertCircle,
      details: [
        "商品到着後7日以内にご連絡ください",
        "注文番号と返品理由をお知らせください",
        "可能であれば商品の写真をお送りください",
        "メールまたはお問い合わせフォームからご連絡"
      ],
      color: "bg-blue-50 border-blue-200"
    },
    {
      number: 2,
      title: "返品承認",
      description: "弊社にて内容を確認し返品可否をご連絡",
      icon: CheckCircle,
      details: [
        "通常24時間以内にご返信します",
        "返品住所をお知らせします",
        "返送方法についてご案内します",
        "返品番号を発行いたします"
      ],
      color: "bg-green-50 border-green-200"
    },
    {
      number: 3,
      title: "商品返送",
      description: "指定された住所に商品を返送",
      icon: RotateCcw,
      details: [
        "未開封・未使用の状態でお願いします",
        "追跡可能な配送方法をご利用ください",
        "返送料金はお客様負担です（弊社都合除く）",
        "返品番号を配送伝票に記載してください"
      ],
      color: "bg-purple-50 border-purple-200"
    },
    {
      number: 4,
      title: "返品確認",
      description: "弊社で返品商品を受け取り確認",
      icon: CheckCircle,
      details: [
        "商品の状態を確認します",
        "返品理由を再度確認します",
        "返金可否を最終判定します",
        "確認後メールでご連絡します"
      ],
      color: "bg-orange-50 border-orange-200"
    },
    {
      number: 5,
      title: "返金処理",
      description: "返品が承認された場合、返金処理を実行",
      icon: Sparkles,
      details: [
        "通常10～15営業日以内に返金します",
        "クレジットカード払いの場合は引き戻し処理",
        "銀行振込の場合は指定口座へ振込",
        "返金完了メールをお送りします"
      ],
      color: "bg-emerald-50 border-emerald-200"
    }
  ];

  const faqs = [
    {
      question: "返品期間は何日ですか？",
      answer: "商品到着後、未開封・未使用の状態であれば、到着日から7日以内にご連絡いただければ返品をお受けいたします。ただし、国際配送の場合、返送に要する送料はお客様のご負担となります。",
      icon: Clock
    },
    {
      question: "破損した商品が届きました。どうすればいいですか？",
      answer: "商品到着時に破損が確認された場合は、速やかにカスタマーサポートにご連絡ください。写真をお送りいただければ、良品を再発送いたします。ただし、国際配送時の箱の凹みやスクラッチは自然発生的な損傷のため、返品・返金の対象外となります。",
      icon: AlertCircle
    },
    {
      question: "注文と異なる商品が届きました。",
      answer: "誠に申し訳ございません。すぐにカスタマーサポートにご連絡ください。正しい商品を再発送いたします。この場合、返送送料は弊社で負担いたします。",
      icon: CheckCircle
    },
    {
      question: "使用後の返品は可能ですか？",
      answer: "申し訳ございませんが、使用後の返品・交換はお受けできません。医薬品の特性上、開封・使用後の商品は返品対象外となります。ご了承ください。",
      icon: AlertCircle
    },
    {
      question: "返金にはどのくらいの時間がかかりますか？",
      answer: "返品受理後、通常10～15営業日以内に返金処理を行います。ただし、国際配送の場合、返送に要する日数が加算されるため、返金までに20～30日程度要する場合があります。",
      icon: Clock
    },
    {
      question: "返品の送料は誰が負担しますか？",
      answer: "お客様都合による返品の場合、返送送料はお客様のご負担となります。ただし、弊社の誤り（商品違い、破損など）による場合は、弊社で返送送料を負担いたします。",
      icon: HelpCircle
    }
  ];

  const returnConditions = [
    {
      title: "返品・交換をお受けできるケース",
      icon: CheckCircle,
      items: [
        "商品到着時に明らかに破損していた場合",
        "ご注文と異なる商品が届いた場合",
        "開封後、商品が不良品とわかった場合",
        "商品の説明と異なる内容だった場合"
      ],
      color: "bg-green-50 border-green-200"
    },
    {
      title: "返品・交換をお受けできないケース",
      icon: AlertCircle,
      items: [
        "すでにご使用になられた商品",
        "使用に支障がない程度のパッケージの破損・変形・汚れ",
        "税関において検査の対象となり、開封された場合",
        "商品デザイン・パッケージの変更を理由としたもの",
        "国際配送時の自然発生的な損傷（凹み・スクラッチなど）",
        "お客様の誤解や勘違いによる返品"
      ],
      color: "bg-red-50 border-red-200"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* ページタイトル */}
      <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-cyan-50 border-b border-primary/10">
        <div className="container max-w-5xl mx-auto py-12 px-4 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            返品・交換ポリシー
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            安心の<span className="text-primary">返品・交換</span>サポート
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            koreamall24 での購入後、ご不安な点やお困りのことがあれば<br />
            安心のサポート体制でお客様をサポートいたします。
          </p>
        </div>
      </div>

      <div className="flex-1">
        {/* メインコンテンツ */}
        <div className="container max-w-5xl mx-auto py-10 px-4 space-y-12">

          {/* 重要なお知らせ */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">重要なお知らせ</h3>
                <div className="space-y-2 text-sm text-amber-800">
                  <p>• 個人輸入代行商品のため、ご入金後のキャンセルはお受けできません</p>
                  <p>• ご注文前に商品内容をよくご確認ください</p>
                  <p>• 返品・交換をご希望の場合は、商品到着後7日以内にカスタマーサポートにご連絡ください</p>
                  <p>• 医薬品の特性上、開封・使用後の商品は返品対象外となります</p>
                </div>
              </div>
            </div>
          </section>

          {/* 返品・交換の条件 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">返品・交換の条件</h2>
                <p className="text-sm text-gray-500">どのような場合に返品が可能かご説明します</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {returnConditions.map((condition, idx) => {
                const Icon = condition.icon;
                return (
                  <div key={idx} className={`bg-white rounded-xl border ${condition.color} p-6`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-full ${condition.color.replace('border', 'bg').replace('50', '100')} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-gray-800">{condition.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {condition.items.map((item, i) => (
                        <p key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{item}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 返品手続きの流れ */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">返品手続きの5つのステップ</h2>
                <p className="text-sm text-gray-500">返品から返金までの流れ</p>
              </div>
            </div>

            <div className="space-y-3">
              {returnSteps.map((step, idx) => {
                const Icon = step.icon;
                const isExpanded = expandedStep === idx;

                return (
                  <div key={step.number} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : idx)}
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
                        <div className="space-y-2">
                          {step.details.map((detail, i) => (
                            <div key={i} className="flex gap-3 text-sm">
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                <p className="text-sm text-gray-500">返品に関するご質問にお答えします</p>
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
                返品・交換に関するご質問やご不明な点は、お気軽にカスタマーサポートにお問い合わせください。
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
      </div>

      <Footer />
    </div>
  );
}
