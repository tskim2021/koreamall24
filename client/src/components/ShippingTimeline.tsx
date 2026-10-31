import { Check, Package, Truck, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: number;
  eventType: string;
  location?: string | null;
  locationJa?: string | null;
  description?: string | null;
  descriptionJa?: string | null;
  timestamp: Date | string;
}

interface ShippingTimelineProps {
  status: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDeliveryDate?: Date | string | null;
  actualDeliveryDate?: Date | string | null;
  currentLocation?: string | null;
  currentLocationJa?: string | null;
  events?: TimelineEvent[];
}

const statusConfig: Record<string, { label: string; labelJa: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    labelJa: "配送準備中",
    color: "bg-gray-100 text-gray-800",
    icon: <Package className="w-5 h-5" />
  },
  picked_up: {
    label: "Picked Up",
    labelJa: "集荷完了",
    color: "bg-blue-100 text-blue-800",
    icon: <Package className="w-5 h-5" />
  },
  in_transit: {
    label: "In Transit",
    labelJa: "配送中",
    color: "bg-blue-100 text-blue-800",
    icon: <Truck className="w-5 h-5" />
  },
  out_for_delivery: {
    label: "Out for Delivery",
    labelJa: "配送予定",
    color: "bg-yellow-100 text-yellow-800",
    icon: <MapPin className="w-5 h-5" />
  },
  delivered: {
    label: "Delivered",
    labelJa: "配達完了",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="w-5 h-5" />
  },
  failed: {
    label: "Failed",
    labelJa: "配達失敗",
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="w-5 h-5" />
  },
  returned: {
    label: "Returned",
    labelJa: "返送中",
    color: "bg-orange-100 text-orange-800",
    icon: <Truck className="w-5 h-5" />
  }
};

const eventTypeConfig: Record<string, { label: string; labelJa: string }> = {
  order_placed: { label: "Order Placed", labelJa: "注文確定" },
  payment_confirmed: { label: "Payment Confirmed", labelJa: "支払い確認" },
  processing: { label: "Processing", labelJa: "処理中" },
  picked_up: { label: "Picked Up", labelJa: "集荷完了" },
  departed: { label: "Departed", labelJa: "発送完了" },
  in_transit: { label: "In Transit", labelJa: "配送中" },
  out_for_delivery: { label: "Out for Delivery", labelJa: "配送予定" },
  delivered: { label: "Delivered", labelJa: "配達完了" },
  failed: { label: "Failed", labelJa: "配達失敗" },
  returned: { label: "Returned", labelJa: "返送中" }
};

export default function ShippingTimeline({
  status,
  trackingNumber,
  carrier,
  estimatedDeliveryDate,
  actualDeliveryDate,
  currentLocation,
  currentLocationJa,
  events = []
}: ShippingTimelineProps) {
  const config = statusConfig[status] || statusConfig.pending;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getProgressPercentage = () => {
    const statusOrder = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered"];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">配送状況</CardTitle>
          <Badge className={config.color}>
            <span className="flex items-center gap-2">
              {config.icon}
              {config.labelJa}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tracking Info */}
        {trackingNumber && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">追跡番号</p>
              <p className="font-mono font-semibold">{trackingNumber}</p>
            </div>
            {carrier && (
              <div>
                <p className="text-gray-600">配送業者</p>
                <p className="font-semibold">{carrier}</p>
              </div>
            )}
            {currentLocationJa && (
              <div className="col-span-2">
                <p className="text-gray-600">現在地</p>
                <p className="font-semibold">{currentLocationJa}</p>
              </div>
            )}
          </div>
        )}

        {/* Estimated Delivery */}
        {estimatedDeliveryDate && status !== "delivered" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">予定配達日</p>
            <p className="font-semibold text-blue-900">{formatDate(estimatedDeliveryDate)}</p>
          </div>
        )}

        {/* Actual Delivery */}
        {actualDeliveryDate && status === "delivered" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">配達完了日</p>
            <p className="font-semibold text-green-900">{formatDate(actualDeliveryDate)}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>配送進捗</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Timeline Events */}
        {events && events.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">配送履歴</h3>
            <div className="space-y-3">
              {events.map((event, index) => {
                const eventConfig = eventTypeConfig[event.eventType] || {
                  label: event.eventType,
                  labelJa: event.descriptionJa || event.description || event.eventType
                };
                const isLast = index === events.length - 1;

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Timeline dot and line */}
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-1" />
                      {!isLast && <div className="w-0.5 h-12 bg-gray-300 mt-1" />}
                    </div>

                    {/* Event content */}
                    <div className="pb-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{eventConfig.labelJa}</p>
                          {event.locationJa && (
                            <p className="text-xs text-gray-600 mt-1">{event.locationJa}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(event.timestamp).toLocaleDateString("ja-JP", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No tracking info message */}
        {!trackingNumber && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              {status === "pending"
                ? "配送情報はまだ利用できません。"
                : "配送情報がありません。"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
