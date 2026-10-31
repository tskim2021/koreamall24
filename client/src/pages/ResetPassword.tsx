import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(search).get("token") || "";
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  // Verify token on mount
  const { data: tokenData, isLoading: isVerifying } = trpc.passwordReset.verifyToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const resetPasswordMutation = trpc.passwordReset.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setResetComplete(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("すべての項目を入力してください");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("パスワードが一致しません");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-white py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              無効なリンク
            </h1>
            <p className="text-gray-600 mb-6">
              パスワード再設定用のリンクが無効です。<br />
              もう一度パスワード再設定をリクエストしてください。
            </p>
            <Link href="/forgot-password" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white">
              パスワード再設定をリクエスト
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Verifying token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-white py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[#b91c1c]" />
            <p className="text-gray-600">リンクを確認中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Invalid or expired token
  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-white py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              リンクが無効または期限切れです
            </h1>
            <p className="text-gray-600 mb-6">
              このパスワード再設定リンクは無効または期限切れです。<br />
              もう一度パスワード再設定をリクエストしてください。
            </p>
            <Link href="/forgot-password" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white">
              パスワード再設定をリクエスト
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-white py-12 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              パスワードを変更しました
            </h1>
            <p className="text-gray-600 mb-6">
              パスワードが正常に変更されました。<br />
              新しいパスワードでログインしてください。
            </p>
            <Link href="/login" className="inline-flex items-center justify-center rounded-full text-lg font-medium px-8 py-3 bg-[#b91c1c] hover:bg-[#991b1b] text-white">
              ログインする
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 bg-white py-12 px-4">
        <div className="max-w-md mx-auto">
          <Link href="/login" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ログインに戻る
          </Link>

          <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">
            新しいパスワードを設定
          </h1>
          <p className="text-gray-600 text-center mb-8">
            <span className="font-medium">{tokenData.email}</span> の<br />
            新しいパスワードを入力してください。
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm text-gray-700">
                新しいパスワード <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="6文字以上で入力してください"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 pr-10 border-gray-300 rounded-md"
                  disabled={resetPasswordMutation.isPending}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-gray-700">
                パスワード確認 <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="もう一度パスワードを入力してください"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pr-10 border-gray-300 rounded-md"
                  disabled={resetPasswordMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">パスワードが一致しません</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-lg font-bold rounded-full"
              disabled={resetPasswordMutation.isPending || newPassword !== confirmPassword}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  変更中...
                </>
              ) : (
                "パスワードを変更"
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">パスワードのヒント</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 6文字以上で設定してください</li>
              <li>• 英数字を組み合わせると安全性が高まります</li>
              <li>• 他のサービスと同じパスワードは避けてください</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
