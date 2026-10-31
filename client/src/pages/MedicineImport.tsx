import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Clock, Package, AlertCircle, CheckCircle, FileText, 
  Phone, Mail, HelpCircle, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function MedicineImport() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: "個人輸入とは何ですか？",
      answer: "個人輸入は、海外で医薬品を購入し、個人の使用目的で日本に輸入することです。医薬品医療機器等法により、個人使用に限り一定量までの医薬品の輸入が認められています。"
    },
    {
      question: "どのような医薬品が輸入できますか？",
      answer: "処方箋医薬品、一般用医薬品、医療用医薬品など、多くの医薬品が輸入対象です。ただし、麻薬や向精神薬、一部の規制医薬品は輸入が禁止されています。詳細はお問い合わせください。"
    },
    {
      question: "配送にはどのくらい時間がかかりますか？",
      answer: "通常、ご注文から7～14営業日で配送されます。ただし、通関検査や天候などの理由により遅延する場合があります。"
    },
    {
      question: "医薬品の安全性は保証されていますか？",
      answer: "koreamall24 で取り扱う医薬品は、すべて正規品であることを保証しています。信頼できる海外医療機関やメーカーから直接仕入れており、品質管理を厳格に行っています。"
    },
    {
      question: "プライバシーは保護されますか？",
      answer: "はい。お客様のプライバシー保護を最優先としています。配送時の梱包は無地で、医薬品であることが外部から分からないようになっています。"
    },
    {
      question: "医薬品の使用方法について相談できますか？",
      answer: "医薬品の使用方法や副作用についてのご質問は、医師や薬剤師にご相談ください。koreamall24 では医学的なアドバイスは提供できません。"
    },
    {
      question: "返品・交換は可能ですか？",
      answer: "商品に不具合がある場合は、返品・交換に応じます。ただし、開封済みの医薬品の返品はお受けできない場合があります。詳細は利用規約をご確認ください。"
    },
    {
      question: "支払い方法は何がありますか？",
      answer: "クレジットカード、銀行振込、電子決済など複数の支払い方法に対応しています。詳細は決済ページをご確認ください。"
    }
  ];

  const benefits = [
    {
      icon: ShieldCheck,
      title: "正規品保証",
      description: "すべての医薬品は正規品であることを保証。信頼できるメーカーから直接仕入れ"
    },
    {
      icon: Clock,
      title: "迅速な配送",
      description: "ご注文から7～14営業日で配送。通関手続きもスムーズに対応"
    },
    {
      icon: Package,
      title: "プライバシー保護",
      description: "無地梱包で配送。医薬品であることが外部から分からないように配慮"
    },
    {
      icon: AlertCircle,
      title: "安全な取引",
      description: "SSL暗号化通信で個人情報を保護。安全な決済環境を提供"
    }
  ];

  const importableCategories = [
    "美容・スキンケア医薬品",
    "AGA・薄毛治療薬",
    "ED治療薬",
    "ダイエット医薬品",
    "健康ケア用品",
    "睡眠・メンタルケア医薬品",
    "女性ケア医薬品",
    "性病・感染症治療薬",
    "抗生物質"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-pink-50 to-purple-50 border-b border-primary/10">
        <div className="container max-w-5xl mx-auto py-12 px-4 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            お薬の個人輸入について
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            医薬品の<span className="text-primary">個人輸入</span>ガイド
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            安全で信頼できる医薬品の個人輸入について、<br />
            詳しくご説明します。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
              <Link href="/search">
                <Package className="w-4 h-4 mr-2" />
                商品を探す
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/mypage/inquiries">
                <Mail className="w-4 h-4 mr-2" />
                1:1問い合わせ
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-10 px-4 space-y-12">

        {/* 1. 個人輸入とは */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">個人輸入とは</h2>
              <p className="text-sm text-gray-500">医薬品の個人輸入について</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <p className="text-gray-700 leading-relaxed">
              個人輸入とは、海外で医薬品を購入し、個人の使用目的で日本に輸入することです。
              医薬品医療機器等法により、個人使用に限り一定量までの医薬品の輸入が認められています。
            </p>
            <p className="text-gray-700 leading-relaxed">
              koreamall24 は、お客様に代わって海外から医薬品を仕入れ、日本に配送するサービスを提供しています。
              すべての医薬品は正規品であることを保証し、厳格な品質管理を行っています。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                個人輸入は医薬品医療機器等法により認められた正規の方法です
              </p>
            </div>
          </div>
        </section>

        {/* 2. メリット */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">個人輸入のメリット</h2>
              <p className="text-sm text-gray-500">koreamall24 で個人輸入するメリット</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-gray-800">{benefit.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 輸入可能な医薬品 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">輸入可能な医薬品</h2>
              <p className="text-sm text-gray-500">koreamall24 で取り扱う医薬品カテゴリ</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {importableCategories.map((category, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-sm text-gray-700">{category}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                麻薬や向精神薬、一部の規制医薬品は輸入が禁止されています。
                詳細についてはお問い合わせください。
              </p>
            </div>
          </div>
        </section>

        {/* 4. 配送・通関について */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">配送・通関について</h2>
              <p className="text-sm text-gray-500">配送期間と通関手続き</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3">配送期間</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">通常配送</span>
                  <span className="font-bold text-primary">7～14営業日</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  ※ 通関検査や天候などの理由により遅延する場合があります
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3">通関手続き</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  税関での検査を経て配送されます。
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  ※ 医薬品の内容や数量により、追加の書類提出が必要な場合があります
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 重要な注意事項 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">重要な注意事項</h2>
              <p className="text-sm text-gray-500">個人輸入時の注意点</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">個人使用に限定</h3>
                <p className="text-sm text-red-800">
                  輸入した医薬品は個人使用に限定されます。他人への販売・譲渡・転売は禁止されています。
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">医師の指示に従う</h3>
                <p className="text-sm text-red-800">
                  医薬品の使用方法や用量については、必ず医師や薬剤師の指示に従ってください。
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">通関情報</h3>
                <p className="text-sm text-red-800">
                  医薬品の輸入には通関手続きが必要です。税関で検査される場合があります。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">よくあるご質問</h2>
              <p className="text-sm text-gray-500">個人輸入についてのよくある質問</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 text-left">{item.question}</span>
                  {expandedFAQ === idx ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {expandedFAQ === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-2xl border border-primary/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            さあ、医薬品の個人輸入を始めましょう
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            koreamall24 なら、安全で信頼できる医薬品を簡単に購入できます。<br />
            ご不明な点やご質問がございましたら、お気軽にお問い合わせください。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
              <Link href="/search">
                <Package className="w-4 h-4 mr-2" />
                商品を探す
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link href="/mypage/inquiries">
                <Phone className="w-4 h-4 mr-2" />
                お問い合わせ
              </Link>
            </Button>
          </div>
        </section>

      </div>

      <Footer />
    </div>
  );
}
