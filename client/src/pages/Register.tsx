import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { handleKatakanaChange } from "@/hooks/useKatakanaInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { lookupPostalCode } from "@/lib/postalCodeLookup";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

type RegistrationStep = "form" | "complete";
type AvailStatus = "idle" | "checking" | "available" | "taken";

/** 전화번호 하이픈 자동 포맷: 010-1234-5678 / 02-123-4567 등 */
function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("0120") || digits.startsWith("0800") || digits.startsWith("0570")) {
    // 0120-XXX-XXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.startsWith("070") || digits.startsWith("080") || digits.startsWith("090") || digits.startsWith("050")) {
    // 0X0-XXXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.startsWith("03") || digits.startsWith("06")) {
    // 0X-XXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  // 기본: 0XX-XXX-XXXX
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 11)}`;
}

export default function Register() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  // Form state
  const [lastNameKanji, setLastNameKanji] = useState("");
  const [firstNameKanji, setFirstNameKanji] = useState("");
  const [lastNameKatakana, setLastNameKatakana] = useState("");
  const [firstNameKatakana, setFirstNameKatakana] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "no_answer" | "">("no_answer");

  // 전화번호 (필수 - 주소 섹션 밖)
  const [phone, setPhone] = useState("");

  // 실시간 중복 확인 상태
  const [emailCheckValue, setEmailCheckValue] = useState("");
  const [phoneCheckValue, setPhoneCheckValue] = useState("");
  const [emailStatus, setEmailStatus] = useState<AvailStatus>("idle");
  const [phoneStatus, setPhoneStatus] = useState<AvailStatus>("idle");

  // Address state (optional)
  const [showAddress, setShowAddress] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");

  // Referral code state
  const [referralCode, setReferralCode] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Registration state
  const [step, setStep] = useState<RegistrationStep>("form");
  const [rememberMe, setRememberMe] = useState(false);

  // URL ?ref= 파라미터로 추천인 코드 자동 적용
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode && refCode.length >= 6) {
      setReferralCode(refCode.toUpperCase());
      setReferralValidating(true);
    }
  }, []);

  // Referral code validation
  const validateReferralCode = trpc.membership.referral.validateCode.useQuery(
    { code: referralCode },
    { enabled: referralCode.length >= 6 && referralValidating }
  );

  // 실시간 이메일 중복 확인
  const emailCheckQuery = trpc.emailAuth.checkEmail.useQuery(
    { email: emailCheckValue },
    { enabled: emailCheckValue.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCheckValue) }
  );

  // 실시간 전화번호 중복 확인
  const phoneCheckQuery = trpc.emailAuth.checkPhone.useQuery(
    { phone: phoneCheckValue },
    { enabled: phoneCheckValue.length >= 9 }
  );

  // 이메일 중복 확인 결과 반영
  useEffect(() => {
    if (emailCheckValue.length === 0) { setEmailStatus("idle"); return; }
    if (emailCheckQuery.isFetching) { setEmailStatus("checking"); return; }
    if (emailCheckQuery.data !== undefined) {
      setEmailStatus(emailCheckQuery.data.exists ? "taken" : "available");
    }
  }, [emailCheckQuery.data, emailCheckQuery.isFetching, emailCheckValue]);

  // 전화번호 중복 확인 결과 반영
  useEffect(() => {
    if (phoneCheckValue.length === 0) { setPhoneStatus("idle"); return; }
    if (phoneCheckQuery.isFetching) { setPhoneStatus("checking"); return; }
    if (phoneCheckQuery.data !== undefined) {
      setPhoneStatus(phoneCheckQuery.data.exists ? "taken" : "available");
    }
  }, [phoneCheckQuery.data, phoneCheckQuery.isFetching, phoneCheckValue]);

  // Handle referral code validation result
  useEffect(() => {
    if (validateReferralCode.data && referralValidating) {
      setReferralValid(validateReferralCode.data.valid);
      setReferrerName(validateReferralCode.data.referrerName || null);
      setReferralValidating(false);
    }
  }, [validateReferralCode.data, referralValidating]);

  // tRPC mutations
  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: (data) => {
      toast.success("会員登録が完了しました！");
      if (data.autoLogin) {
        setTimeout(() => { setLocation("/"); }, 1500);
      } else {
        setStep("complete");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handle postal code change with auto-lookup
  const handlePostalCodeChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 7) {
      setPostalCode(cleaned);
      if (cleaned.length === 7) {
        setIsLookingUpPostalCode(true);
        const result = lookupPostalCode(cleaned);
        setIsLookingUpPostalCode(false);
        if (result) {
          setPrefecture(result.prefecture);
          setCity(result.city);
          setAddress1(result.town);
          toast.success("住所を自動入力しました");
        } else {
          toast.error("郵便番号が見つかりませんでした");
        }
      }
    }
  };

  // 전화번호 입력 핸들러 (하이픈 자동 포맷)
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    // 포커스 중에도 실시간 체크 (숫자만 추출해서 9자 이상이면 체크)
    const digits = formatted.replace(/-/g, "");
    if (digits.length >= 9) {
      setPhoneCheckValue(digits);
    } else {
      setPhoneCheckValue("");
      setPhoneStatus("idle");
    }
  };

  // 이메일 blur 시 중복 확인 트리거
  const handleEmailBlur = () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailCheckValue(email);
    } else {
      setEmailCheckValue("");
      setEmailStatus("idle");
    }
  };

  const handleReferralBlur = () => {
    if (referralCode.length >= 6) {
      setReferralValidating(true);
    } else if (referralCode.length === 0) {
      setReferralValid(null);
      setReferrerName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastNameKanji || !firstNameKanji || !lastNameKatakana || !firstNameKatakana || !email || !password) {
      toast.error("必須項目をすべて入力してください");
      return;
    }
    if (!phone || phone.replace(/-/g, "").length < 9) {
      toast.error("電話番号を正しく入力してください");
      return;
    }
    const katakanaRegex = /^[゠-ヿー　\s　]+$/;
    if (!katakanaRegex.test(lastNameKatakana) || !katakanaRegex.test(firstNameKatakana)) {
      toast.error("フリガナはカタカナで入力してください");
      return;
    }
    if (password.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }
    if (emailStatus === "taken") {
      toast.error("このメールアドレスはすでに登録されています");
      return;
    }
    if (phoneStatus === "taken") {
      toast.error("この電話番号はすでに登録されています");
      return;
    }

    const nameKanji = `${lastNameKanji}　${firstNameKanji}`;
    const nameHiragana = `${lastNameKatakana}　${firstNameKatakana}`;
    const phoneDigits = phone.replace(/-/g, "");

    const addressData = showAddress && postalCode && prefecture && city && address1
      ? {
          recipientNameKanji: nameKanji,
          recipientNameHiragana: nameHiragana,
          postalCode,
          prefecture,
          city,
          address1,
          address2: address2 || undefined,
          isDefault: true,
        }
      : undefined;

    registerMutation.mutate({
      email,
      password,
      nameKanji,
      nameHiragana,
      lastNameKanji,
      firstNameKanji,
      lastNameKatakana,
      firstNameKatakana,
      gender: (gender as "male" | "female" | "no_answer") || "no_answer",
      referralCode: referralCode || undefined,
      rememberMe,
      address: addressData ? {
        ...addressData,
        phone: phoneDigits,
      } : undefined,
    });
  };

  const handleSNSRegister = () => {
    window.location.href = getLoginUrl();
  };

  const isLoading = registerMutation.isPending;

  // 중복 확인 메시지 렌더러
  const renderEmailStatus = () => {
    if (emailStatus === "idle") return null;
    if (emailStatus === "checking") return (
      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> 確認中...</p>
    );
    if (emailStatus === "available") return (
      <p className="flex items-center gap-1 text-xs text-green-600 mt-1"><CheckCircle className="w-3 h-3" /> 登録可能なメールアドレスです</p>
    );
    if (emailStatus === "taken") return (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><XCircle className="w-3 h-3" /> このメールアドレスはすでに使用されています。別のアドレスを入力してください</p>
    );
  };

  const renderPhoneStatus = () => {
    if (phoneStatus === "idle") return null;
    if (phoneStatus === "checking") return (
      <p className="flex items-center gap-1 text-xs text-gray-400 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> 確認中...</p>
    );
    if (phoneStatus === "available") return (
      <p className="flex items-center gap-1 text-xs text-green-600 mt-1"><CheckCircle className="w-3 h-3" /> 登録可能な電話番号です</p>
    );
    if (phoneStatus === "taken") return (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><XCircle className="w-3 h-3" /> この電話番号はすでに使用されています。別の番号を入力してください</p>
    );
  };

  // Registration Complete Screen
  if (step === "complete") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-[#faf8f5] py-12 px-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white p-12 rounded-lg text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">会員登録完了</h1>
              <p className="text-gray-600 mb-2">ご登録ありがとうございます！</p>
              <p className="text-gray-600 mb-8">500ポイントをプレゼントしました。</p>
              <div className="space-y-4">
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full h-14 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-lg font-bold rounded-md"
                >
                  ログインする
                </Button>
                <Link href="/" className="block text-blue-600 hover:underline">
                  トップページへ戻る
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 bg-[#faf8f5] py-8 md:py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">
              新規会員登録
            </h1>
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">
              ココくすりへようこそ。以下の情報を入力してご登録ください。
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              {/* お名前（漢字）— 姓 / 名 */}
              <div>
                <Label className="text-sm md:text-base text-gray-700 font-semibold block mb-2">
                  お名前（漢字） <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lastNameKanji" className="text-xs text-gray-500 mb-1 block">姓（必須）</Label>
                    <Input
                      id="lastNameKanji"
                      type="text"
                      placeholder="例：山田"
                      value={lastNameKanji}
                      onChange={(e) => setLastNameKanji(e.target.value)}
                      className="h-12 md:h-14 text-base border-gray-300"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstNameKanji" className="text-xs text-gray-500 mb-1 block">名（必須）</Label>
                    <Input
                      id="firstNameKanji"
                      type="text"
                      placeholder="例：太郎"
                      value={firstNameKanji}
                      onChange={(e) => setFirstNameKanji(e.target.value)}
                      className="h-12 md:h-14 text-base border-gray-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* フリガナ（カタカナ）— セイ / メイ */}
              <div>
                <Label className="text-sm md:text-base text-gray-700 font-semibold block mb-2">
                  フリガナ（カタカナ） <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lastNameKatakana" className="text-xs text-gray-500 mb-1 block">セイ（必須）</Label>
                    <Input
                      id="lastNameKatakana"
                      type="text"
                      placeholder="例：ヤマダ"
                      value={lastNameKatakana}
                      onChange={handleKatakanaChange(setLastNameKatakana)}
                      className="h-12 md:h-14 text-base border-gray-300"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstNameKatakana" className="text-xs text-gray-500 mb-1 block">メイ（必須）</Label>
                    <Input
                      id="firstNameKatakana"
                      type="text"
                      placeholder="例：タロウ"
                      value={firstNameKatakana}
                      onChange={handleKatakanaChange(setFirstNameKatakana)}
                      className="h-12 md:h-14 text-base border-gray-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">※カタカナで入力してください</p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm md:text-base text-gray-700 font-semibold">
                  メールアドレス <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="メールアドレスを入力してください"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle"); setEmailCheckValue(""); }}
                  onBlur={handleEmailBlur}
                  className={`mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300 ${emailStatus === "taken" ? "border-red-400" : emailStatus === "available" ? "border-green-400" : ""}`}
                  disabled={isLoading}
                />
                {renderEmailStatus()}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-sm md:text-base text-gray-700 font-semibold">
                  パスワード <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2 md:mt-3">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力してください（6文字以上）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 md:h-14 text-base border-gray-300 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 md:w-6 h-5 md:h-6" /> : <Eye className="w-5 md:w-6 h-5 md:h-6" />}
                  </button>
                </div>
              </div>

              {/* 電話番号（必須） */}
              <div>
                <Label htmlFor="phone" className="text-sm md:text-base text-gray-700 font-semibold">
                  電話番号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="例: 090-1234-5678"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300 ${phoneStatus === "taken" ? "border-red-400" : phoneStatus === "available" ? "border-green-400" : ""}`}
                  disabled={isLoading}
                  maxLength={13}
                />
                {renderPhoneStatus()}
                <p className="text-xs text-gray-400 mt-1">※ハイフンは自動で入力されます</p>
              </div>

              {/* Gender */}
              <div>
                <Label className="text-sm md:text-base text-gray-700 font-semibold block mb-2 md:mb-3">
                  性別（任意）
                </Label>
                <RadioGroup value={gender} onValueChange={(value) => setGender(value as "male" | "female" | "no_answer")}>
                  <div className="flex items-center gap-6 md:gap-8">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" disabled={isLoading} />
                      <Label htmlFor="male" className="text-sm md:text-base font-normal cursor-pointer">男性</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" disabled={isLoading} />
                      <Label htmlFor="female" className="text-sm md:text-base font-normal cursor-pointer">女性</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no_answer" id="no_answer" disabled={isLoading} />
                      <Label htmlFor="no_answer" className="text-sm md:text-base font-normal cursor-pointer">回答しない</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Referral Code (Optional) */}
              <div className="border-t pt-4 md:pt-6">
                <Label className="text-sm md:text-base text-gray-700 font-semibold">
                  紹介コード (任意)
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  お友達から紹介コードをもらった方はこちらに入力してください
                </p>
                <div className="relative">
                  <Input
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      setReferralValid(null);
                      setReferralValidating(false);
                    }}
                    onBlur={handleReferralBlur}
                    placeholder="例: ABCD1234"
                    className="uppercase tracking-wider"
                    maxLength={8}
                    disabled={isLoading}
                  />
                  {referralValid === true && (
                    <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      紹介者: {referrerName} 様
                    </div>
                  )}
                  {referralValid === false && (
                    <div className="mt-1 text-sm text-red-500">無効な紹介コードです</div>
                  )}
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-xs md:text-sm text-gray-600 cursor-pointer select-none"
                  >
                    ログイン状態を維持する
                  </label>
                </div>
              </div>

              {/* Address Section (Optional) */}
              <div className="border-t pt-4 md:pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddress(!showAddress)}
                  className="flex items-center justify-between w-full text-left mb-3 md:mb-4"
                  disabled={isLoading}
                >
                  <Label className="text-sm md:text-base text-gray-700 font-semibold">
                    配送先住所 (任意)
                  </Label>
                  <span className="text-xs md:text-sm text-gray-500">
                    {showAddress ? "▲ 閉じる" : "▼ 追加する"}
                  </span>
                </button>

                {showAddress && (
                  <div className="space-y-3 md:space-y-4 pl-3 md:pl-4 border-l-2 border-gray-200">
                    {/* Postal Code */}
                    <div>
                      <Label htmlFor="postalCode" className="text-sm md:text-base text-gray-700">郵便番号</Label>
                      <Input
                        id="postalCode"
                        type="text"
                        placeholder="例: 1234567"
                        value={postalCode}
                        onChange={(e) => handlePostalCodeChange(e.target.value)}
                        className="mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300"
                        disabled={isLoading || isLookingUpPostalCode}
                      />
                      {isLookingUpPostalCode && (
                        <p className="text-xs md:text-sm text-gray-500 mt-1">住所を検索中...</p>
                      )}
                    </div>

                    {/* Prefecture */}
                    <div>
                      <Label htmlFor="prefecture" className="text-sm md:text-base text-gray-700">都道府県</Label>
                      <select
                        id="prefecture"
                        value={prefecture}
                        onChange={(e) => setPrefecture(e.target.value)}
                        className="mt-2 md:mt-3 w-full px-3 h-12 md:h-14 text-base border border-gray-300 rounded-md bg-white disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <option value="">――選択してください――</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>{pref}</option>
                        ))}
                      </select>
                    </div>

                    {/* City */}
                    <div>
                      <Label htmlFor="city" className="text-sm md:text-base text-gray-700">市区町村</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="例: 渋谷区"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Address1 */}
                    <div>
                      <Label htmlFor="address1" className="text-sm md:text-base text-gray-700">町名・番地</Label>
                      <Input
                        id="address1"
                        type="text"
                        placeholder="例: 道玄坂1-2-3"
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        className="mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Address2 */}
                    <div>
                      <Label htmlFor="address2" className="text-sm md:text-base text-gray-700">建物名・部屋番号 (任意)</Label>
                      <Input
                        id="address2"
                        type="text"
                        placeholder="例: マンション名101号室"
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        className="mt-2 md:mt-3 h-12 md:h-14 text-base border-gray-300"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Terms */}
              <div className="text-xs md:text-sm text-gray-600">
                <p>
                  登録することにより、当社の
                  <Link href="/terms-of-service" className="text-blue-600 hover:underline">利用規約</Link>
                  と
                  <Link href="/privacy-policy" className="text-blue-600 hover:underline">プライバシー規約</Link>
                  に同意したものとみなします。
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || emailStatus === "taken" || phoneStatus === "taken"}
                className="w-full h-12 md:h-14 bg-[#b91c1c] hover:bg-[#991b1b] text-white text-base md:text-lg font-bold rounded-md mt-4 md:mt-6 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "会員登録"
                )}
              </Button>
            </form>

            {/* SNS Registration */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-gray-600 mb-4">他のサービスで登録</p>
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleSNSRegister}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-md"
                >
                  LINEで登録
                </Button>
                <Button
                  type="button"
                  onClick={handleSNSRegister}
                  className="w-full h-12 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold rounded-md"
                >
                  Googleで登録
                </Button>
              </div>
            </div>

            {/* Login Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                すでにアカウントをお持ちですか？
                <Link href="/login" className="text-blue-600 hover:underline ml-2">ログイン</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
