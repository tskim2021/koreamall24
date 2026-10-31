import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  Package,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── 이벤트 상태 번역 맵 ─────────────────────────────────────────────────────
// JP: 일본어 라벨, KR: 한국어 라벨
const STATUS_MAP: Record<string, { jp: string; kr: string }> = {
  // DB 이벤트 타입
  order_placed:       { jp: "注文受付",       kr: "주문 접수" },
  payment_confirmed:  { jp: "入金確認",       kr: "결제 확인" },
  processing:         { jp: "処理中",         kr: "처리 중" },
  picked_up:          { jp: "集荷完了",       kr: "집하 완료" },
  departed:           { jp: "発送完了",       kr: "발송 완료" },
  in_transit:         { jp: "配送中",         kr: "배송 중" },
  out_for_delivery:   { jp: "配達中",         kr: "배달 중" },
  delivered:          { jp: "配達完了",       kr: "배달 완료" },
  shipped:            { jp: "発送済み",       kr: "발송됨" },
  failed:             { jp: "配達失敗",       kr: "배달 실패" },
  returned:           { jp: "返送中",         kr: "반송 중" },
  pending:            { jp: "準備中",         kr: "준비 중" },
  exception:          { jp: "配達失敗",       kr: "배달 실패" },
  // 일본우편 스크래핑 상태 (이미 일본어이므로 jp = 원문, kr = 번역)
  "引受":                         { jp: "引受",                         kr: "발송 완료" },
  "発送":                         { jp: "発送",                         kr: "발송 완료" },
  "国際交換局から発送":             { jp: "国際交換局から発送",             kr: "국제교환국 발송" },
  "到着":                         { jp: "到着",                         kr: "도착" },
  "配達中":                       { jp: "配達中",                       kr: "배달 중" },
  "お届け済み":                   { jp: "お届け済み",                   kr: "배달 완료" },
  "配達完了":                     { jp: "配達完了",                     kr: "배달 완료" },
  "不在":                         { jp: "不在",                         kr: "부재중" },
  "持ち戻り":                     { jp: "持ち戻り",                     kr: "미배달 반환" },
  "通関中":                       { jp: "通関中",                       kr: "통관 중" },
  "通関手続中":                   { jp: "通関手続中",                   kr: "통관 수속 중" },
  "保管中":                       { jp: "保管中",                       kr: "보관 중" },
  "返送":                         { jp: "返送",                         kr: "반송" },
  "税関から名宛人に照会中":         { jp: "税関から名宛人に照会中",         kr: "세관 조회 중" },
  "税関検査のため税関へ提示":       { jp: "税関検査のため税関へ提示",       kr: "세관 검사 제출" },
  "国際交換局に到着":               { jp: "国際交換局に到着",               kr: "국제교환국 도착" },
  "配達希望受付":                   { jp: "配達希望受付",                   kr: "배달 희망 접수" },
};

// UI 고정 텍스트
const UI_TEXT = {
  jp: {
    title: "配送タイムライン",
    productLabel: "",
    syncLabel: "同期",
    refresh: "更新",
    trackingLabel: "追跡番号",
    autoDetect: "自動検出",
    recipient: "受取人",
    copy: "コピー",
    copied: "コピー済",
    loading: "配送情報を読み込み中...",
    refreshing: "日本郵便から最新情報を取得中...",
    noCache: "同期済みの配送情報がありません。",
    noCacheHint: "更新ボタンを押して日本郵便から最新情報を取得してください。",
    fetchNow: "今すぐ取得",
    noEvents: "配送履歴がありません。",
    current: "現在",
    footerSync: "最終同期",
    footerAuto: "毎日自動更新",
    footerNoSync: "更新ボタンで最新情報を取得",
    close: "閉じる",
    alertPrefix: "",
  },
  kr: {
    title: "통합배송 타임라인",
    productLabel: "",
    syncLabel: "동기화",
    refresh: "새로고침",
    trackingLabel: "송장번호",
    autoDetect: "자동 감지",
    recipient: "수신자",
    copy: "복사",
    copied: "복사됨",
    loading: "배송 정보를 불러오는 중...",
    refreshing: "일본우편에서 최신 배송 정보를 가져오는 중...",
    noCache: "아직 동기화된 배송 정보가 없습니다.",
    noCacheHint: "새로고침 버튼을 눌러 일본우편에서 최신 정보를 가져오세요.",
    fetchNow: "지금 조회하기",
    noEvents: "배송 이력이 없습니다.",
    current: "현재",
    footerSync: "마지막 동기화",
    footerAuto: "매일 자동 업데이트",
    footerNoSync: "새로고침으로 최신 배송 정보 조회",
    close: "닫기",
    alertPrefix: "",
  },
};

// 경고 타입 번역
const ALERT_TYPE_MAP: Record<string, { jp: string; kr: string }> = {
  customs:       { jp: "税関照会", kr: "세관 조회" },
  absent:        { jp: "不在・持ち戻り", kr: "부재중·미배달 반환" },
  failed:        { jp: "配達失敗", kr: "배달 실패" },
  post_storage:  { jp: "郵便局保管", kr: "우체국 보관" },
};

function getStatusLabel(status: string, lang: "jp" | "kr"): string {
  const entry = STATUS_MAP[status];
  if (entry) return entry[lang];
  // 매핑 없으면 원문 그대로 (일본어 원문 or 영어 국명 등)
  return status;
}

function getEventIcon(type: string) {
  if (type === "delivered" || type === "お届け済み" || type === "配達完了") {
    return <CheckCircle2 className="w-3.5 h-3.5" />;
  }
  if (type === "failed" || type === "不在" || type === "持ち戻り") {
    return <XCircle className="w-3.5 h-3.5" />;
  }
  if (type === "order_placed" || type === "payment_confirmed") {
    return <Package className="w-3.5 h-3.5" />;
  }
  return <Truck className="w-3.5 h-3.5" />;
}

function getEventColor(type: string, isFirst: boolean): string {
  if (type === "delivered" || type === "お届け済み" || type === "配達完了") {
    return "bg-green-500 text-white";
  }
  if (type === "failed" || type === "不在" || type === "持ち戻り") {
    return "bg-red-400 text-white";
  }
  if (isFirst) {
    return "bg-pink-600 text-white ring-4 ring-pink-100";
  }
  return "bg-gray-200 text-gray-500";
}

function getCarrierName(carrier?: string | null, lang: "jp" | "kr" = "jp"): string {
  if (!carrier) return lang === "jp" ? "自動検出" : "자동 감지";
  const map: Record<string, { jp: string; kr: string }> = {
    "Japan Post": { jp: "日本郵便", kr: "일본우편 (日本郵便)" },
    Yamato:       { jp: "ヤマト運輸", kr: "야마토운수 (ヤマト)" },
    Sagawa:       { jp: "佐川急便", kr: "사가와 (佐川急便)" },
    DHL:          { jp: "DHL", kr: "DHL" },
    FedEx:        { jp: "FedEx", kr: "FedEx" },
    EMS:          { jp: "EMS（国際特急郵便）", kr: "EMS (국제특급우편)" },
  };
  return map[carrier]?.[lang] ?? carrier;
}

function formatDate(d: Date | string, lang: "jp" | "kr"): string {
  const date = new Date(d);
  const locale = lang === "jp" ? "ja-JP" : "ko-KR";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSyncTime(d: Date | string | null | undefined, lang: "jp" | "kr"): string {
  if (!d) return "";
  const date = new Date(d);
  const locale = lang === "jp" ? "ja-JP" : "ko-KR";
  return date.toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrackingTimelineModalProps {
  open: boolean;
  onClose: () => void;
  trackingNumber: string;
  orderStatus: string;
  productName?: string;
  orderId?: string | number;
  carrier?: string | null;
  shippingName?: string;
}

interface DisplayEvent {
  timestamp: Date;
  type: string;
  label: string;
  location?: string;
}

export default function TrackingTimelineModal({
  open,
  onClose,
  trackingNumber,
  orderStatus,
  productName,
  orderId,
  carrier,
  shippingName,
}: TrackingTimelineModalProps) {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<"jp" | "kr">("jp");

  const t = UI_TEXT[lang];

  // ─── DB 캐시 조회 (즉시 표시) ─────────────────────────────────────────
  const cacheQuery = trpc.admin.getTrackingCached.useQuery(
    { trackingNumber },
    { enabled: open && !!trackingNumber }
  );

  // ─── 수동 새로고침 mutation ───────────────────────────────────────────
  const refreshMutation = trpc.admin.refreshTrackingCache.useMutation({
    onSuccess: (data) => {
      cacheQuery.refetch();
      if (data.hasAlert) {
        const alertLabel = data.alertType
          ? (ALERT_TYPE_MAP[data.alertType]?.[lang] ?? data.alertType)
          : (lang === "jp" ? "確認が必要です" : "확인 필요");
        toast.warning(`⚠️ ${lang === "jp" ? "警告イベント検出" : "경고 이벤트 감지"}: ${alertLabel}`);
      } else {
        toast.success(lang === "jp" ? "配送情報が更新されました。" : "배송 정보가 업데이트되었습니다.");
      }
    },
    onError: () => {
      toast.error(lang === "jp" ? "配送情報の更新に失敗しました。" : "배송 정보 업데이트에 실패했습니다.");
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate({ 
      trackingNumber, 
      carrier: carrier || "Japan Post", 
      orderId: orderId ? (typeof orderId === 'string' ? parseInt(orderId, 10) : orderId) : undefined
    });
  };

  // ─── 이벤트 목록 구성 ─────────────────────────────────────────────────
  const cached = cacheQuery.data?.cached;
  const events: DisplayEvent[] = (() => {
    if (!cached?.events || cached.events.length === 0) return [];
    return cached.events
      .map((e: any) => {
        const rawDesc = e.description || e.status || "";
        return {
          timestamp: new Date(e.timestamp),
          type: e.status || rawDesc,
          label: getStatusLabel(rawDesc, lang),
          location: e.location || undefined,
        };
      })
      .sort((a: DisplayEvent, b: DisplayEvent) => b.timestamp.getTime() - a.timestamp.getTime());
  })();

  const isLoading = cacheQuery.isLoading;
  const isRefreshing = refreshMutation.isPending;
  const hasAlert = cached?.hasAlert;
  const alertDescription = cached?.alertDescription;
  const lastSyncedAt = cached?.lastSyncedAt;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      setCopied(true);
      toast.success(lang === "jp" ? "追跡番号をコピーしました。" : "송장번호가 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const japanPostUrl = `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${trackingNumber}&locale=ja`;
  const track17Url = `https://www.17track.net/ko/track?nums=${trackingNumber}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* ─── 헤더 ─────────────────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex flex-col gap-3">
            {/* 제목 행 */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-600 flex-shrink-0" />
                  <span>{t.title}</span>
                  {events.length > 0 && (
                    <span className="text-sm font-normal text-gray-400">{events.length}{lang === "jp" ? "件" : "건"}</span>
                  )}
                </DialogTitle>
                {productName && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{productName}</p>
                )}
              </div>
            </div>
            {/* 버튼 행 */}
            <div className="flex items-center justify-end gap-2">
              {/* JP / KR 언어 토글 */}
              <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setLang("jp")}
                  className={`px-2.5 py-1 transition-colors ${
                    lang === "jp"
                      ? "bg-pink-600 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  JP
                </button>
                <button
                  onClick={() => setLang("kr")}
                  className={`px-2.5 py-1 transition-colors border-l border-gray-200 ${
                    lang === "kr"
                      ? "bg-pink-600 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  KR
                </button>
              </div>
              {/* 새로고침 버튼 */}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2.5"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {t.refresh}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ─── 경고 배너 ────────────────────────────────────────────────── */}
        {hasAlert && alertDescription && (
          <div className="mx-5 mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>
              {lang === "jp"
                ? alertDescription  // 원문 일본어 그대로
                : (() => {
                    // KR 모드: alertDescription에서 경고 타입 키워드를 한국어로 치환
                    let desc = alertDescription;
                    for (const [key, val] of Object.entries(ALERT_TYPE_MAP)) {
                      desc = desc.replace(new RegExp(val.jp, "g"), val.kr);
                    }
                    return desc;
                  })()}
            </span>
          </div>
        )}

        {/* ─── 송장번호 카드 ─────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-3 flex-shrink-0">
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                {t.trackingLabel} · {getCarrierName(carrier, lang)}
              </p>
              <p className="font-mono text-sm font-bold text-gray-800 truncate">{trackingNumber}</p>
              {shippingName && (
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {t.recipient}: {shippingName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? t.copied : t.copy}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => window.open(japanPostUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-3 h-3" />
                JP
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 px-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open(track17Url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-3 h-3" />
                17track
              </Button>
            </div>
          </div>
        </div>

        {/* ─── 타임라인 본문 ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {/* 로딩 */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.loading}
            </div>
          )}

          {/* 새로고침 중 오버레이 */}
          {isRefreshing && events.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3 border border-blue-100">
              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
              {t.refreshing}
            </div>
          )}

          {/* 캐시 없음 안내 */}
          {!isLoading && !cached && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 font-medium">{t.noCache}</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">{t.noCacheHint}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {t.fetchNow}
              </Button>
            </div>
          )}

          {/* 이벤트 없음 */}
          {!isLoading && cached && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">{t.noEvents}</p>
              {cached.syncError && (
                <p className="text-xs text-red-400 mt-1">{cached.syncError}</p>
              )}
            </div>
          )}

          {/* 타임라인 */}
          {events.length > 0 && (
            <div className="relative">
              {/* 수직 연결선 */}
              <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gray-200" />

              <div className="space-y-0">
                {events.map((event, index) => {
                  const isFirst = index === 0;
                  const iconColor = getEventColor(event.type, isFirst);

                  return (
                    <div key={index} className="flex gap-4 relative">
                      {/* 아이콘 */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 transition-all ${iconColor}`}
                      >
                        {getEventIcon(event.type)}
                      </div>

                      {/* 내용 */}
                      <div className={`flex-1 ${index === events.length - 1 ? "pb-0" : "pb-5"}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${isFirst ? "text-gray-900" : "text-gray-600"}`}>
                            {event.label}
                          </p>
                          {isFirst && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 text-pink-500 border-pink-200 bg-pink-50 leading-tight"
                            >
                              {t.current}
                            </Badge>
                          )}
                        </div>
                        {event.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {event.location}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {formatDate(event.timestamp, lang)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── 푸터 ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <p className="text-[10px] text-gray-400">
            {cached
              ? `${t.footerSync}: ${formatSyncTime(lastSyncedAt, lang)} · ${t.footerAuto}`
              : t.footerNoSync}
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
