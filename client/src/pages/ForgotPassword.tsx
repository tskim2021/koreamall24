import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestResetMutation = trpc.passwordReset.requestReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    requestResetMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 bg-white py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* Back to login link */}
          <Link href="/login" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ログインに戻る
          </Link>

          {!submitted ? (
            <>
              <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">
                パスワードをお忘れですか？
              </h1>
              <p className="text-gray-600 text-center mb-8">
                ご登録のメールアドレスを入力してください。<br />
                パスワード再設定用のリンクをお送りします。
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-gray-700">
                    メールアドレス <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="メールアドレスを入力ください"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-10 border-gray-300 rounded-md"
                      disabled={requestResetMutation.isPending}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-lg font-bold rounded-full"
                  disabled={requestResetMutation.isPending}
                >
                  {requestResetMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    "再設定メールを送信"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-4 text-gray-800">
                メールを送信しました
              </h1>
              <p className="text-gray-600 mb-6">
                <span className="font-medium text-gray-800">{email}</span> 宛に<br />
                パスワード再設定用のリンクを送信しました。
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  メールが届かない場合は、迷惑メールフォルダをご確認ください。<br />
                  リンクは1時間有効です。
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="mr-4"
              >
                別のメールアドレスで再送信
              </Button>
              <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white">
                ログインに戻る
              </Link>
            </div>
          )}

          {/* Help text */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">お困りですか？</h3>
            <p className="text-sm text-gray-600">
              メールが届かない場合やその他のお問い合わせは、
              <Link href="/bbs/inquiry/create" className="text-blue-600 hover:underline">
                お問い合わせフォーム
              </Link>
              からご連絡ください。
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
