import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

interface ShippingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: TrackingEvent[];
  trackingNumber: string;
  carrier: string;
}

export default function ShippingHistoryModal({
  isOpen,
  onClose,
  events,
  trackingNumber,
  carrier,
}: ShippingHistoryModalProps) {
  // イベントを時間順にソート（新しい順）
  const sortedEvents = [...(events || [])].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  // アコーディオン状態管理
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配送履歴全体</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 配送情報ヘッダー */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">追跡番号</p>
                <p className="font-mono font-semibold text-blue-900">
                  {trackingNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">配送業者</p>
                <p className="font-semibold text-blue-900">{carrier}</p>
              </div>
            </div>
          </div>

          {/* 配送履歴アコーディオン */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">
              配送履歴 ({sortedEvents.length}件)
            </h3>

            {sortedEvents.length > 0 ? (
              <div className="space-y-2 border border-gray-200 rounded-lg divide-y">
                {sortedEvents.map((event, index) => (
                  <div
                    key={index}
                    className="border-0"
                  >
                    {/* アコーディオンヘッダー */}
                    <button
                      onClick={() => toggleExpand(index)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {event.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(event.timestamp).toLocaleString("ja-JP")}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${
                          expandedIndex === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* アコーディオンコンテンツ */}
                    {expandedIndex === index && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        {event.location && (
                          <div className="flex items-start gap-2">
                            <span className="text-lg">📍</span>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">
                                場所
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {event.location}
                              </p>
                            </div>
                          </div>
                        )}
                        {event.status && (
                          <div className="mt-3 flex items-start gap-2">
                            <span className="text-lg">📋</span>
                            <div>
                              <p className="text-xs text-gray-600 font-medium">
                                ステータス
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {event.status}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">配送履歴がありません</p>
              </div>
            )}
          </div>

          {/* 閉じるボタン */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
