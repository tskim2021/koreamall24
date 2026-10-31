import { Truck, Package, MapPin, CalendarDays, ExternalLink, Clock } from "lucide-react";

// Carrier info with tracking URL patterns
const carrierConfig: Record<string, { 
  name: string; 
  color: string; 
  bgColor: string;
  trackingUrl: (num: string) => string;
}> = {
  "Japan Post": {
    name: "日本郵便",
    color: "text-red-600",
    bgColor: "bg-red-50",
    trackingUrl: (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  },
  "Yamato": {
    name: "ヤマト運輸",
    color: "text-green-700",
    bgColor: "bg-green-50",
    trackingUrl: (num) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${num}`,
  },
  "Sagawa": {
    name: "佐川急便",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    trackingUrl: (num) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${num}`,
  },
  "DHL": {
    name: "DHL",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    trackingUrl: (num) => `https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${num}`,
  },
  "FedEx": {
    name: "FedEx",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    trackingUrl: (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
  },
  "EMS": {
    name: "EMS",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    trackingUrl: (num) => `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=ja`,
  },
};

// Shipping status steps
const statusSteps = [
  { key: "pending", label: "準備中", icon: Package },
  { key: "picked_up", label: "集荷", icon: Package },
  { key: "in_transit", label: "配送中", icon: Truck },
  { key: "out_for_delivery", label: "配達中", icon: Truck },
  { key: "delivered", label: "配達完了", icon: MapPin },
];

function getStepIndex(status: string): number {
  if (status === "delivered") return 4;
  if (status === "out_for_delivery") return 3;
  if (status === "in_transit") return 2;
  if (status === "picked_up") return 1;
  return 0;
}

interface ShipmentTrackingMiniProps {
  shipment: {
    carrier?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    estimatedDeliveryDate?: string | Date | null;
    currentLocation?: string | null;
    currentLocationJa?: string | null;
  };
  orderStatus: string;
}

export default function ShipmentTrackingMini({ shipment, orderStatus }: ShipmentTrackingMiniProps) {
  const carrier = shipment.carrier ? carrierConfig[shipment.carrier] : null;
  const currentStep = getStepIndex(shipment.status || "pending");
  const isDelivered = shipment.status === "delivered" || orderStatus === "delivered";

  const trackingUrl = carrier && shipment.trackingNumber
    ? carrier.trackingUrl(shipment.trackingNumber)
    : null;

  return (
    <div className={`mt-3 rounded-lg border p-3 ${isDelivered ? "bg-green-50/50 border-green-200" : "bg-blue-50/50 border-blue-200"}`}>
      {/* Header: Carrier + Tracking Number */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Truck className={`w-4 h-4 ${carrier?.color || "text-gray-500"}`} />
          <span className={`text-sm font-medium ${carrier?.color || "text-gray-700"}`}>
            {carrier?.name || shipment.carrier || "配送業者"}
          </span>
        </div>
        {trackingUrl && shipment.trackingNumber && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(trackingUrl, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
          >
            {shipment.trackingNumber}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        {!trackingUrl && shipment.trackingNumber && (
          <span className="text-xs text-gray-600 font-mono">{shipment.trackingNumber}</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative mb-2.5">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, idx) => {
            const isActive = idx <= currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={step.key} className="flex flex-col items-center relative z-10" style={{ width: "20%" }}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? isCurrent
                        ? isDelivered
                          ? "bg-green-500 text-white ring-2 ring-green-200"
                          : "bg-blue-500 text-white ring-2 ring-blue-200"
                        : isDelivered
                          ? "bg-green-500 text-white"
                          : "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <step.icon className="w-2.5 h-2.5" />
                </div>
                <span className={`text-[10px] mt-1 leading-tight text-center ${
                  isActive ? (isDelivered ? "text-green-700 font-medium" : "text-blue-700 font-medium") : "text-gray-400"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Progress line */}
        <div className="absolute top-2.5 left-[10%] right-[10%] h-0.5 bg-gray-200 -z-0">
          <div
            className={`h-full transition-all duration-500 ${isDelivered ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Bottom info: Location + Estimated delivery */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1">
          {shipment.currentLocation && (
            <>
              <MapPin className="w-3 h-3" />
              <span>{shipment.currentLocationJa || shipment.currentLocation}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {shipment.estimatedDeliveryDate && !isDelivered && (
            <>
              <CalendarDays className="w-3 h-3" />
              <span>
                配達予定: {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
              </span>
            </>
          )}
          {isDelivered && (
            <>
              <Clock className="w-3 h-3 text-green-600" />
              <span className="text-green-700 font-medium">配達完了</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { carrierConfig };
