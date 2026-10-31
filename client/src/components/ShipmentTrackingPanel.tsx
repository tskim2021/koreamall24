import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Package, CheckCircle, MapPin, Globe, RefreshCw,
  ExternalLink, Loader2, AlertCircle, Clock, XCircle, ChevronDown, ChevronUp
} from "lucide-react";

// Carrier config
const carrierConfig: Record<string, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  trackingUrl: (num: string) => string;
}> = {
  "Japan Post": {
    name: "日本郵便",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    trackingUrl: (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  },
  "Yamato": {
    name: "ヤマト運輸",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    trackingUrl: (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
  },
  "Sagawa": {
    name: "佐川急便",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    trackingUrl: (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
  },
  "DHL": {
    name: "DHL",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    trackingUrl: (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
  },
  "FedEx": {
    name: "FedEx",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    trackingUrl: (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
  },
  "EMS": {
    name: "EMS",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    trackingUrl: (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  },
};

interface ShipmentTrackingPanelProps {
  shipment: {
    carrier?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    estimatedDeliveryDate?: string | Date | null;
    currentLocation?: string | null;
    currentLocationJa?: string | null;
    events?: any[];
  };
  orderStatus: string;
  orderId: number;
  onDeliveryDetected?: () => void;
  forceShowTracking?: boolean;
}

export default function ShipmentTrackingPanel({
  shipment,
  orderStatus,
  orderId,
  onDeliveryDetected,
  forceShowTracking = false,
}: ShipmentTrackingPanelProps) {
  const carrier = shipment.carrier ? carrierConfig[shipment.carrier] : null;
  const isDelivered = shipment.status === "delivered" || orderStatus === "delivered";
  const [showHistory, setShowHistory] = useState(false);
  const [japanPostData, setJapanPostData] = useState<any>(null);
  const [isLoadingJP, setIsLoadingJP] = useState(false);
  const [jpError, setJpError] = useState<string | null>(null);

  const trackingUrl = carrier && shipment.trackingNumber
    ? carrier.trackingUrl(shipment.trackingNumber)
    : null;

  // Japan Post real-time tracking
  const japanPostQuery = trpc.japanPost.getTracking.useQuery(
    { trackingNumber: shipment.trackingNumber || "" },
    { enabled: false }
  );

  const fetchJapanPostTracking = async () => {
    if (!shipment.trackingNumber || shipment.carrier !== "Japan Post") return;
    setIsLoadingJP(true);
    setJpError(null);
    try {
      const result = await japanPostQuery.refetch();
      if (result.data) {
        setJapanPostData(result.data);
        if (result.data.status === "delivered" && orderStatus !== "delivered") {
          onDeliveryDetected?.();
        }
      }
    } catch {
      setJpError("追跡情報の取得に失敗しました");
    } finally {
      setIsLoadingJP(false);
    }
  };

  useEffect(() => {
    if (shipment.trackingNumber && shipment.carrier === "Japan Post") {
      fetchJapanPostTracking();
    }
  }, [shipment.trackingNumber]);

  // Merge events: DB events + Japan Post events
  const mergedEvents = (() => {
    const events: { timestamp: Date; type: string; label: string; location?: string; source: string; descriptionJa?: string }[] = [];

    if (shipment.events) {
      for (const e of shipment.events) {
        const eventLabels: Record<string, string> = {
          order_placed: "注文受付",
          payment_confirmed: "決済確認",
          processing: "処理中",
          picked_up: "集荷完了",
          departed: "発送完了",
          in_transit: "輸送中",
          out_for_delivery: "配達中",
          delivered: "配達完了",
          shipped: "発送済み",
          failed: "配達失敗",
          returned: "返送中",
        };
        events.push({
          timestamp: new Date(e.timestamp),
          type: e.eventType,
          label: eventLabels[e.eventType] || e.eventType,
          location: e.locationJa || e.location,
          descriptionJa: e.descriptionJa || e.description,
          source: "system",
        });
      }
    }

    if (japanPostData?.events) {
      for (const e of japanPostData.events) {
        const jpTimestamp = new Date(e.date || e.timestamp);
        const jpDescription = e.detail || e.status || "更新";
        const jpLocation = e.office || e.location;
        
        const isDuplicate = events.some(dbEvent => 
          Math.abs(dbEvent.timestamp.getTime() - jpTimestamp.getTime()) < 300000 &&
          dbEvent.descriptionJa === jpDescription && dbEvent.location === jpLocation
        );
        
        if (!isDuplicate) {
          events.push({
            timestamp: jpTimestamp,
            type: e.status || "info",
            label: jpDescription,
            location: jpLocation,
            descriptionJa: jpDescription,
            source: "japan_post",
          });
        }
      }
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return events;
  })();

  // Determine effective status
  const effectiveStatus = japanPostData?.status || shipment.status || "pending";
  const effectiveDelivered = effectiveStatus === "delivered" || isDelivered;
  const effectiveLocation = japanPostData?.currentLocation || shipment.currentLocationJa || shipment.currentLocation;

  // Status label
  const statusLabel = effectiveDelivered ? "配達完了" :
    effectiveStatus === "out_for_delivery" ? "配達中" :
    effectiveStatus === "in_transit" ? "輸送中" :
    effectiveStatus === "picked_up" ? "集荷済" : "準備中";

  return (
    <Card className="mb-6 border-gray-200 bg-white print:border-gray-300 print:bg-white">
      <CardContent className="p-0">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              effectiveDelivered ? "bg-green-100" : "bg-blue-100"
            }`}>
              {effectiveDelivered ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Truck className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">配送追跡</span>
                {carrier && (
                  <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${carrier.color} ${carrier.bgColor} ${carrier.borderColor}`}>
                    {carrier.name}
                  </Badge>
                )}
                <Badge className={`text-[11px] px-1.5 py-0 ${
                  effectiveDelivered 
                    ? "bg-green-100 text-green-700 border-green-200" 
                    : "bg-blue-100 text-blue-700 border-blue-200"
                }`} variant="outline">
                  {statusLabel}
                </Badge>
              </div>
              {shipment.trackingNumber && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-500">追跡番号:</span>
                  <span className="font-mono text-xs font-medium text-gray-700">{shipment.trackingNumber}</span>
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 print:hidden"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 print:hidden">
            {shipment.carrier === "Japan Post" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchJapanPostTracking}
                disabled={isLoadingJP}
                className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJP ? "animate-spin" : ""}`} />
              </Button>
            )}
            {trackingUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(trackingUrl, "_blank")}
                className="h-8 px-2.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="ml-1 hidden sm:inline">公式サイト</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status Detail (only show extra info when not delivered or has location/estimate) */}
        {(!effectiveDelivered || effectiveLocation) && (
          <div className="px-5 py-3 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {effectiveLocation && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {effectiveLocation}
                  </p>
                )}
              </div>
              {shipment.estimatedDeliveryDate && !effectiveDelivered && (
                <p className="text-sm text-gray-600">
                  配達予定: <span className="font-medium text-blue-700">
                    {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Japan Post Loading/Error */}
        {isLoadingJP && (
          <div className="flex items-center gap-2 text-sm text-blue-600 px-5 py-2.5 border-b border-gray-50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            日本郵便から情報を取得中...
          </div>
        )}
        {jpError && (
          <div className="flex items-center gap-2 text-sm text-red-600 px-5 py-2.5 border-b border-gray-50">
            <AlertCircle className="w-3.5 h-3.5" />
            {jpError}
          </div>
        )}

        {/* Event History Toggle */}
        {mergedEvents.length > 0 && (
          <div className="print:hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full justify-center py-2.5 hover:bg-gray-50"
            >
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              配送履歴 ({mergedEvents.length}件)
            </button>

            {showHistory && (
              <div className="px-5 pb-4 max-h-72 overflow-y-auto">
                <div className="space-y-0">
                  {mergedEvents.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0
                            ? effectiveDelivered ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          {event.type === "delivered" ? <CheckCircle className="w-2.5 h-2.5" /> :
                           event.type === "in_transit" || event.type === "shipped" || event.type === "departed" ? <Truck className="w-2.5 h-2.5" /> :
                           event.type === "failed" ? <XCircle className="w-2.5 h-2.5" /> :
                           <Package className="w-2.5 h-2.5" />}
                        </div>
                        {index < mergedEvents.length - 1 && (
                          <div className="w-px h-6 bg-gray-200" />
                        )}
                      </div>
                      <div className="pb-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-800">{event.label}</p>
                          {event.source === "japan_post" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-red-500 border-red-200 leading-tight">JP</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          {event.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-2 h-2" /> {event.location}
                            </span>
                          )}
                          <span>{event.timestamp.toLocaleString("ja-JP")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { carrierConfig };
