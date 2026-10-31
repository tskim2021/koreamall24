import { useState, useEffect, useRef } from "react";
import { hiraganaToKatakana } from "@/hooks/useKatakanaInput";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Edit, Star } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MyPageSidebar from "@/components/MyPageSidebar";
import { trpc } from "@/lib/trpc";
import { lookupPostalCode } from "@/lib/postalCodeLookup";
import { createValidationHandlers } from "@/lib/validationHandlers";
import { MapView } from "@/components/Map";

export default function MypageAddresses() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [label, setLabel] = useState("");
  const [recipientNameKanji, setRecipientNameKanji] = useState("");
  const [recipientNameHiragana, setRecipientNameHiragana] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [phone, setPhone] = useState("");

  // Map preview state
  const [mapAddress, setMapAddress] = useState("");
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Update map when address fields change
  useEffect(() => {
    if (prefecture && city && address1) {
      const fullAddress = `${prefecture}${city}${address1}`;
      setMapAddress(fullAddress);
      setShowMap(true);
    } else {
      setShowMap(false);
    }
  }, [prefecture, city, address1]);

  // Update map marker when mapAddress changes
  useEffect(() => {
    if (mapRef.current && mapAddress && showMap) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: mapAddress }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const location = results[0].geometry.location;
          mapRef.current!.setCenter(location);
          mapRef.current!.setZoom(16);
          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new google.maps.Marker({ position: location, map: mapRef.current! });
        }
      });
    }
  }, [mapAddress, showMap]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validators = createValidationHandlers(setErrors);

  // tRPC queries
  const { data: addresses = [], isLoading, refetch } = trpc.address.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.address.create.useMutation({
    onSuccess: () => {
      toast.success("住所を追加しました");
      refetch();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.address.update.useMutation({
    onSuccess: () => {
      toast.success("住所を更新しました");
      refetch();
      resetForm();
      setIsDialogOpen(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.address.delete.useMutation({
    onSuccess: () => {
      toast.success("住所を削除しました");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setDefaultMutation = trpc.address.setDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルト住所を設定しました");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setRecipientNameKanji("");
    setRecipientNameHiragana("");
    setPostalCode("");
    setIsLookingUp(false);
    setPrefecture("");
    setCity("");
    setAddress1("");
    setAddress2("");
    setPhone("");
    setErrors({});
    setShowMap(false);
    setMapAddress("");
  };

  const handlePostalCodeChange = (value: string) => {
    // Remove non-numeric characters
    const cleaned = value.replace(/[^0-9]/g, "");
    if (cleaned.length <= 7) {
      setPostalCode(cleaned);
      
      // Auto-lookup when 7 digits are entered
      if (cleaned.length === 7) {
        setIsLookingUp(true);
        const result = lookupPostalCode(cleaned);
        setIsLookingUp(false);
        
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

  const handleEdit = (address: typeof addresses[0]) => {
    setEditingId(address.id);
    setLabel(address.label || "");
    setRecipientNameKanji(address.recipientNameKanji);
    setRecipientNameHiragana(address.recipientNameHiragana);
    setPostalCode(address.postalCode);
    setPrefecture(address.prefecture);
    setCity(address.city);
    setAddress1(address.address1);
    setAddress2(address.address2 || "");
    setPhone(address.phone);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientNameKanji || !recipientNameHiragana || !postalCode || !prefecture || !city || !address1 || !phone) {
      toast.error("必須項目を入力してください");
      return;
    }

    const addressData = {
      label: label || undefined,
      recipientNameKanji,
      recipientNameHiragana,
      postalCode,
      prefecture,
      city,
      address1,
      address2: address2 || undefined,
      phone,
      isDefault: addresses.length === 0, // First address is default
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...addressData });
    } else {
      createMutation.mutate(addressData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("この住所を削除してもよろしいですか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container py-12">
          <div className="max-w-md mx-auto text-center">
            <p className="text-gray-600 mb-4">ログインが必要です</p>
            <Button onClick={() => setLocation("/login")} className="bg-primary hover:bg-primary/90">
              ログインページへ
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-8">
          {/* Breadcrumb */}
          <p className="text-sm text-gray-500 mb-4">
            <span
              className="hover:text-gray-700 cursor-pointer"
              onClick={() => setLocation("/mypage")}
            >マイページ</span>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="text-gray-800 font-medium">配送先住所</span>
          </p>

          <div className="flex gap-6 lg:gap-8 items-start">
            {/* Sidebar */}
            <div className="hidden md:block w-[220px] flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <MyPageSidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ── 상단 헤더 배너 (MyOrder 스타일) ── */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5" style={{backgroundColor: '#fffbeb', borderColor: 'oklch(0.924 0.12 95.746)'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">配送先住所</h1>
                      <p className="text-xs text-primary font-medium mt-0.5">お届け先住所を管理できます</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-600">登録住所数</div>
                      <div className="text-2xl font-bold text-primary">{addresses.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 住所追加ボタン ── */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">住所管理</p>
                    <p className="text-sm text-gray-600">配送先住所の追加・編集・削除ができます</p>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                      resetForm();
                      setEditingId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-primary/90 flex-shrink-0" size="sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        新しい住所を追加
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingId ? "住所を編集" : "新しい住所を追加"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="label">配送先名（任意）</Label>
                          <Input
                            id="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="例: 自宅、会社、実家"
                          />
                          <p className="text-xs text-gray-500 mt-1">配送先を区別するための名称を設定できます。</p>
                        </div>
                        {/* お名前（漢字） */}
                        <div>
                          <Label className="font-medium">お名前（漢字） <span className="text-red-500">*</span></Label>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div>
                              <Label htmlFor="recipientLastNameKanji" className="text-xs text-gray-500">姓</Label>
                              <Input
                                id="recipientLastNameKanji"
                                value={recipientNameKanji.split("　")[0] || ""}
                                onChange={(e) => {
                                  const sei = e.target.value;
                                  const mei = recipientNameKanji.split("　")[1] || "";
                                  setRecipientNameKanji(sei + "　" + mei);
                                }}
                                placeholder="例：山田"
                                className={errors.recipientNameKanji ? "border-red-500" : ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="recipientFirstNameKanji" className="text-xs text-gray-500">名</Label>
                              <Input
                                id="recipientFirstNameKanji"
                                value={recipientNameKanji.split("　")[1] || ""}
                                onChange={(e) => {
                                  const sei = recipientNameKanji.split("　")[0] || "";
                                  const mei = e.target.value;
                                  setRecipientNameKanji(sei + "　" + mei);
                                }}
                                placeholder="例：太郎"
                                className={errors.recipientNameKanji ? "border-red-500" : ""}
                              />
                            </div>
                          </div>
                          {errors.recipientNameKanji && (
                            <p className="text-sm text-red-500 mt-1">{errors.recipientNameKanji}</p>
                          )}
                        </div>
                        {/* フリガナ */}
                        <div>
                          <Label className="font-medium">フリガナ（カタカナ） <span className="text-red-500">*</span></Label>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div>
                              <Label htmlFor="recipientLastNameHiragana" className="text-xs text-gray-500">セイ</Label>
                              <Input
                                id="recipientLastNameHiragana"
                                value={recipientNameHiragana.split("　")[0] || ""}
                                onChange={(e) => {
                                  const sei = hiraganaToKatakana(e.target.value);
                                  const mei = recipientNameHiragana.split("　")[1] || "";
                                  setRecipientNameHiragana(sei + "　" + mei);
                                }}
                                placeholder="例：ヤマダ"
                                className={errors.recipientNameHiragana ? "border-red-500" : ""}
                              />
                            </div>
                            <div>
                              <Label htmlFor="recipientFirstNameHiragana" className="text-xs text-gray-500">メイ</Label>
                              <Input
                                id="recipientFirstNameHiragana"
                                value={recipientNameHiragana.split("　")[1] || ""}
                                onChange={(e) => {
                                  const sei = recipientNameHiragana.split("　")[0] || "";
                                  const mei = hiraganaToKatakana(e.target.value);
                                  setRecipientNameHiragana(sei + "　" + mei);
                                }}
                                placeholder="例：タロウ"
                                className={errors.recipientNameHiragana ? "border-red-500" : ""}
                              />
                            </div>
                          </div>
                          {errors.recipientNameHiragana && (
                            <p className="text-sm text-red-500 mt-1">{errors.recipientNameHiragana}</p>
                          )}
                        </div>
                        {/* 郵便番号 */}
                        <div>
                          <Label htmlFor="postalCode">郵便番号 *</Label>
                          <div className="flex gap-2 mt-1">
                            <div className="relative flex-1">
                              <Input
                                id="postalCode"
                                value={postalCode}
                                onChange={(e) => handlePostalCodeChange(e.target.value)}
                                placeholder="1234567（ハイフンなし）"
                                maxLength={7}
                                className={errors.postalCode ? "border-red-500" : ""}
                              />
                              {isLookingUp && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>
                          {errors.postalCode && (
                            <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">7桁の郵便番号を入力すると住所が自動入力されます</p>
                        </div>
                        {/* 都道府県 + 市区町村 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="prefecture">都道府県 *</Label>
                            <Input
                              id="prefecture"
                              value={prefecture}
                              onChange={(e) => {
                                setPrefecture(e.target.value);
                                validators.validatePrefectureField(e.target.value);
                              }}
                              placeholder="東京都"
                              required
                              className={errors.prefecture ? "border-red-500" : ""}
                            />
                            {errors.prefecture && (
                              <p className="text-sm text-red-500 mt-1">{errors.prefecture}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="city">市区町村 *</Label>
                            <Input
                              id="city"
                              value={city}
                              onChange={(e) => {
                                setCity(e.target.value);
                                validators.validateCityField(e.target.value);
                              }}
                              placeholder="渋谷区"
                              required
                              className={errors.city ? "border-red-500" : ""}
                            />
                            {errors.city && (
                              <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                            )}
                          </div>
                        </div>
                        {/* 町名・番地 */}
                        <div>
                          <Label htmlFor="address1">町名・番地 *</Label>
                          <Input
                            id="address1"
                            value={address1}
                            onChange={(e) => {
                              setAddress1(e.target.value);
                              validators.validateAddress1Field(e.target.value);
                            }}
                            placeholder="道玄坂1-2-3"
                            required
                            className={errors.address1 ? "border-red-500" : ""}
                          />
                          {errors.address1 && (
                            <p className="text-sm text-red-500 mt-1">{errors.address1}</p>
                          )}
                        </div>
                        {/* 地図プレビュー */}
                        {showMap && mapAddress && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500 mb-1.5">📍 住所の確認</p>
                            <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '200px' }}>
                              <MapView
                                onMapReady={(map) => {
                                  mapRef.current = map;
                                  const geocoder = new google.maps.Geocoder();
                                  geocoder.geocode({ address: mapAddress }, (results, status) => {
                                    if (status === 'OK' && results?.[0]) {
                                      const location = results[0].geometry.location;
                                      map.setCenter(location);
                                      map.setZoom(16);
                                      if (markerRef.current) markerRef.current.setMap(null);
                                      markerRef.current = new google.maps.Marker({ position: location, map });
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* 建物名・部屋番号 */}
                        <div>
                          <Label htmlFor="address2">建物名・部屋番号</Label>
                          <Input
                            id="address2"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            placeholder="マンション名101号室"
                          />
                        </div>
                        {/* 電話番号 */}
                        <div>
                          <Label htmlFor="phone">電話番号 *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              validators.validatePhoneField(e.target.value);
                            }}
                            placeholder="09012345678"
                            required
                            className={errors.phone ? "border-red-500" : ""}
                          />
                          {errors.phone && (
                            <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              resetForm();
                              setEditingId(null);
                            }}
                            className="flex-1"
                          >
                            キャンセル
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90"
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {editingId ? "更新" : "追加"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* ── 住所リスト ── */}
              {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-1">登録された住所がありません</p>
                  <p className="text-xs text-gray-400">「新しい住所を追加」ボタンから追加してください</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`rounded-xl border bg-white overflow-hidden transition-colors ${
                        address.isDefault
                          ? "border-primary/30 ring-1 ring-primary/20"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* 이름 + 배지 */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-sm font-bold text-gray-900">
                                {address.recipientNameKanji}
                              </h3>
                              <span className="text-xs text-gray-400">({address.recipientNameHiragana})</span>
                              {address.label && (
                                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                  {address.label}
                                </span>
                              )}
                              {address.isDefault && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                  <Star className="w-3 h-3 fill-current" />
                                  デフォルト
                                </span>
                              )}
                            </div>
                            {/* 주소 정보 */}
                            <div className="space-y-0.5">
                              <p className="text-sm text-gray-700">
                                <span className="text-gray-400 text-xs mr-1">〒</span>
                                {address.postalCode}　{address.prefecture} {address.city}
                              </p>
                              <p className="text-sm text-gray-700">{address.address1}{address.address2 ? ` ${address.address2}` : ""}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                <span className="mr-1">📞</span>{address.phone}
                              </p>
                            </div>
                          </div>
                          {/* 액션 버튼 */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!address.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefault(address.id)}
                                disabled={setDefaultMutation.isPending}
                                className="text-xs h-8 px-2.5 hidden sm:flex items-center gap-1"
                              >
                                <Star className="w-3 h-3" />
                                デフォルト
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(address)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(address.id)}
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* 모바일에서 デフォルト 버튼 */}
                        {!address.isDefault && (
                          <div className="mt-3 pt-3 border-t border-gray-100 sm:hidden">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(address.id)}
                              disabled={setDefaultMutation.isPending}
                              className="text-xs h-7 px-2 w-full"
                            >
                              <Star className="w-3 h-3 mr-1" />
                              デフォルトに設定
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>{/* /main content */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
