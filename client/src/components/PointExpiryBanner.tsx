import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, X } from "lucide-react";

export function PointExpiryBanner() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data } = trpc.pointExpiry.getMyExpiringPoints.useQuery(
    { daysAhead: 30 },
    {
      enabled: !!user,
      staleTime: 1000 * 60 * 10, // 10분 캐시
    }
  );

  if (!user || dismissed || !data || data.totalExpiring <= 0) return null;

  const expiryDateStr = data.nearestExpiry
    ? new Date(data.nearestExpiry).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const daysLeft = data.nearestExpiry
    ? Math.ceil(
        (new Date(data.nearestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 truncate">
            <span className="font-semibold">{data.totalExpiring.toLocaleString()}pt</span>
            {expiryDateStr && (
              <>
                が{" "}
                <span className="font-semibold">{expiryDateStr}</span>
                {daysLeft !== null && daysLeft <= 7 && (
                  <span className="ml-1 text-red-600 font-bold">（残り{daysLeft}日）</span>
                )}
                に失効します。
              </>
            )}
            お早めにご利用ください。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/mypage/points")}
            className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
          >
            ポイント履歴を確認
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500 hover:text-amber-700 p-0.5"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
