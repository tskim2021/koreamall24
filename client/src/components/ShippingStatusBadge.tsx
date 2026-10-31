import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, AlertCircle } from "lucide-react";

export type ShippingStatus = "pending" | "in_transit" | "out_for_delivery" | "delivered" | "exception";

interface ShippingStatusBadgeProps {
  status?: ShippingStatus | null;
  className?: string;
}

const shippingStatusMap: Record<ShippingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "配送準備中",
    color: "bg-yellow-100 text-yellow-800",
    icon: <Package className="w-3 h-3" />,
  },
  in_transit: {
    label: "配送中",
    color: "bg-blue-100 text-blue-800",
    icon: <Truck className="w-3 h-3" />,
  },
  out_for_delivery: {
    label: "配達中",
    color: "bg-indigo-100 text-indigo-800",
    icon: <Truck className="w-3 h-3" />,
  },
  delivered: {
    label: "配達完了",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  exception: {
    label: "配送例外",
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

/**
 * ShippingStatusBadge Component
 * Displays shipping status with color-coded badge
 * 
 * @param status - Shipping status (pending, in_transit, out_for_delivery, delivered, exception)
 * @param className - Additional CSS classes
 */
export function ShippingStatusBadge({ status, className }: ShippingStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const statusInfo = shippingStatusMap[status];

  return (
    <Badge className={`${statusInfo.color} flex items-center gap-1 ${className || ""}`}>
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
}

/**
 * Get shipping status label
 * @param status - Shipping status
 * @returns Label string
 */
export function getShippingStatusLabel(status?: ShippingStatus | null): string {
  if (!status) {
    return "配送情報なし";
  }
  return shippingStatusMap[status].label;
}

/**
 * Get shipping status color
 * @param status - Shipping status
 * @returns Color class string
 */
export function getShippingStatusColor(status?: ShippingStatus | null): string {
  if (!status) {
    return "bg-gray-100 text-gray-800";
  }
  return shippingStatusMap[status].color;
}
