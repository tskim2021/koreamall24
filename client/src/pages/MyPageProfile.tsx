import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Loader2, Lock } from "lucide-react";
import MyPageSidebar from "@/components/MyPageSidebar";

export default function MyPageProfile() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    nameKanji: user?.nameKanji || "",
    nameHiragana: user?.nameHiragana || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        alert("プロフィールが更新されました。");
        setIsEditing(false);
        // Refresh user data
        setTimeout(() => window.location.reload(), 500);
      }
    },
    onError: (error) => {
      alert(error.message || "プロフィール更新に失敗しました。");
    },
  });

  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: (data) => {
      alert("パスワードが変更されました。");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      alert(error.message || "パスワード変更に失敗しました。");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("新しいパスワードが一致しません。");
      return;
    }
    if (newPassword.length < 6) {
      alert("パスワードは6文字以上である必要があります。");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-600 mb-6">ログインが必要です。</p>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/login")}
            >
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <MyPageSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-8">プロフィール編集</h1>

            {/* User Info Card */}
            <Card className="mb-8">
            <CardHeader>
              <CardTitle>ユーザー情報</CardTitle>
              <CardDescription>基本的なアカウント情報</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                  <p className="mt-1 text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">登録日</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(user?.createdAt || "").toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Profile Edit Card */}
            <Card>
            <CardHeader>
              <CardTitle>個人情報</CardTitle>
              <CardDescription>名前、電話番号、住所を編集できます</CardDescription>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">名前</label>
                    <p className="mt-1 text-gray-900">{formData.name || "未設定"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">名前（漢字）</label>
                    <p className="mt-1 text-gray-900">{formData.nameKanji || "未設定"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">おなまえ（ひらがな）</label>
                    <p className="mt-1 text-gray-900">{formData.nameHiragana || "未設定"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">電話番号</label>
                    <p className="mt-1 text-gray-900">{formData.phone || "未設定"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">住所</label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{formData.address || "未設定"}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button onClick={() => setIsEditing(true)} className="mt-6 bg-primary hover:bg-primary/90">
                      編集する
                    </Button>
                    <Button onClick={() => setLocation('/mypage/addresses')} variant="outline" className="mt-6">
                      住所録を管理
                    </Button>
                    <Button onClick={() => setShowPasswordModal(true)} variant="outline" className="mt-6 text-red-600 border-red-200 hover:bg-red-50">
                      <Lock className="w-4 h-4 mr-2" />
                      パスワード変更
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      名前
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="名前を入力"
                    />
                  </div>
                  <div>
                    <label htmlFor="nameKanji" className="block text-sm font-medium text-gray-700 mb-1">
                      名前（漢字）
                    </label>
                    <Input
                      id="nameKanji"
                      name="nameKanji"
                      value={formData.nameKanji}
                      onChange={handleChange}
                      placeholder="山田太郎"
                    />
                  </div>
                  <div>
                    <label htmlFor="nameHiragana" className="block text-sm font-medium text-gray-700 mb-1">
                      おなまえ（ひらがな）
                    </label>
                    <Input
                      id="nameHiragana"
                      name="nameHiragana"
                      value={formData.nameHiragana}
                      onChange={handleChange}
                      placeholder="やまだたろう"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="電話番号を入力"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      住所
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="住所を入力"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      {updateProfileMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user?.name || "",
                          nameKanji: user?.nameKanji || "",
                          nameHiragana: user?.nameHiragana || "",
                          phone: user?.phone || "",
                          address: user?.address || "",
                        });
                      }}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
            </Card>

            {/* Password Change Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      パスワード変更
                    </CardTitle>
                    <CardDescription>現在のパスワードと新しいパスワードを入力してください</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          現在のパスワード
                        </label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="現在のパスワード"
                          disabled={changePasswordMutation.isPending}
                        />
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          新しいパスワード
                        </label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="新しいパスワード（6文字以上）"
                          disabled={changePasswordMutation.isPending}
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          新しいパスワード（確認）
                        </label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="新しいパスワード（確認）"
                          disabled={changePasswordMutation.isPending}
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {changePasswordMutation.isPending ? "変更中..." : "変更"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowPasswordModal(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                          disabled={changePasswordMutation.isPending}
                          className="flex-1"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
