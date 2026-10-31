import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            お支払いがキャンセルされました
          </h1>

          <p className="text-gray-600 mb-8">
            お支払い手続きがキャンセルされました。
            カートの商品はそのまま保存されています。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/cart")}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              カートに戻る
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-gray-300"
            >
              買い物を続ける
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
