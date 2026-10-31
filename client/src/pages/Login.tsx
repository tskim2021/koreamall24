import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const loginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // React 언마운트 완료 후 리다이렉트하여 removeChild 오류 방지
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    loginMutation.mutate({ email, password, rememberMe });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 flex items-center justify-center py-8 md:py-16 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-10">
            {/* Logo / Title */}
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-gray-800">
                ログイン
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
                メールアドレスとパスワードでログインしてください
              </p>
            </div>

            {/* Already logged in */}
            {isAuthenticated && user && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 text-xs md:text-sm">
                  <span className="font-bold">{user.name || user.email}</span> としてログイン中です。
                </p>
                <Link href="/" className="text-blue-600 hover:underline text-xs md:text-sm mt-1 inline-block">
                  トップページへ戻る →
                </Link>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3 md:space-y-5">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="email" className="text-xs md:text-sm font-medium text-gray-700">
                  メールアドレス <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="メールアドレスを入力ください"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 md:h-14 text-base border-gray-300 rounded-lg"
                  disabled={loginMutation.isPending}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="password" className="text-xs md:text-sm font-medium text-gray-700">
                  パスワード <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力ください"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 md:h-14 text-base pr-10 border-gray-300 rounded-lg"
                    disabled={loginMutation.isPending}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loginMutation.isPending}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-xs md:text-sm text-gray-600 cursor-pointer select-none"
                  >
                    ログイン状態を維持する
                  </label>
                </div>
                <Link href="/forgot-password" className="text-xs md:text-sm text-blue-600 hover:underline">
                  パスワードをお忘れですか？
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 md:h-14 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-base md:text-lg font-bold rounded-full mt-2 md:mt-4"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-100 text-center">
              <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3">まだアカウントをお持ちでない方</p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center h-10 md:h-11 px-6 md:px-8 border-2 border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white font-bold rounded-full transition-colors text-xs md:text-sm"
              >
                新規会員登録
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
