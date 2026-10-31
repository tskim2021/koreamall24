import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Parse session_id from URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const id = params.get("session_id");
    if (id) {
      setSessionId(id);
    }
  }, [searchString]);

  // Get session details
  const { data: session, isLoading } = trpc.checkout.getSession.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          {isLoading ? (
            <div className="py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">注文情報を確認中...</p>
            </div>
          ) : (
            <>
              {/* Success Icon */}
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                ご注文ありがとうございます！
              </h1>

              <p className="text-gray-600 mb-2">
                お支払いが正常に完了しました。
              </p>
              <p className="text-gray-600 mb-8">
                ご注文確認メールを{session?.customerEmail || "ご登録のメールアドレス"}に送信しました。
              </p>

              {session?.amountTotal && (
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">お支払い金額</h2>
                  <p className="text-3xl font-bold text-pink-600">
                    {formatPrice(session.amountTotal)}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-left">
                    <p className="font-medium text-blue-800">配送について</p>
                    <p className="text-sm text-blue-700 mt-1">
                      ご注文商品は通常3〜5営業日以内に発送いたします。
                      発送完了後、追跡番号をメールでお知らせいたします。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setLocation("/mypage")}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  注文履歴を確認する
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="border-gray-300"
                >
                  買い物を続ける
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
