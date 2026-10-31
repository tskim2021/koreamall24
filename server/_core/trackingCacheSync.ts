/**
 * trackingCacheSync.ts
 * 배송추적 DB 캐시 동기화 + 경고 이벤트 감지 + 관리자 알림
 *
 * 흐름:
 * 1. 배송중(in_transit / picked_up / out_for_delivery) 상태의 송장번호 전체 조회
 * 2. 각 송장번호에 대해 일본우편 스크래핑 실행
 * 3. 결과를 shipment_tracking_cache 테이블에 upsert
 * 4. 세관 조회 / 부재중 / 배달 실패 등 경고 이벤트 감지 → 관리자 알림 발송
 */

import { getDb } from "../db";
import { shipments, shipmentTrackingCache } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { fetchJapanPostTracking, isValidJapanPostTrackingNumber } from "./japanPostTracking";
import { notifyOwner } from "./notification";

// ─── 경고 키워드 정의 ─────────────────────────────────────────────────────────
const ALERT_PATTERNS: { type: string; keywords: string[]; label: string }[] = [
  {
    type: "customs",
    keywords: ["税関", "通関", "関税", "照会", "customs", "Customs"],
    label: "세관 조회",
  },
  {
    type: "absent",
    keywords: ["不在", "持ち戻り", "再配達", "absent", "留置"],
    label: "부재중 / 미배달",
  },
  {
    type: "failed",
    keywords: ["配達失敗", "配達不能", "返送", "戻し", "failed", "undeliverable"],
    label: "배달 실패",
  },
  {
    type: "held",
    keywords: ["保管", "留置", "差出人に返送", "held", "holding"],
    label: "우체국 보관",
  },
];

function detectAlert(events: { description: string; status: string; location?: string }[]): {
  hasAlert: boolean;
  alertType: string | null;
  alertDescription: string | null;
} {
  // 이벤트를 시간순으로 정렬 (최신순)
  const sortedEvents = [...events].sort((a, b) => {
    // timestamp가 없으면 순서 유지
    return 0;
  });

  // 가장 최신 이벤트만 확인
  if (sortedEvents.length === 0) {
    return { hasAlert: false, alertType: null, alertDescription: null };
  }

  const latestEvent = sortedEvents[0];
  const text = `${latestEvent.description || ""} ${latestEvent.status || ""} ${latestEvent.location || ""}`;

  // 최신 이벤트가 경고 키워드인지 확인
  for (const pattern of ALERT_PATTERNS) {
    if (pattern.keywords.some((kw) => text.includes(kw))) {
      return {
        hasAlert: true,
        alertType: pattern.type,
        alertDescription: `[${pattern.label}] ${latestEvent.description || latestEvent.status || latestEvent.location}`,
      };
    }
  }

  return { hasAlert: false, alertType: null, alertDescription: null };
}

// ─── 단일 송장번호 동기화 ─────────────────────────────────────────────────────
export async function syncTrackingCache(
  trackingNumber: string,
  carrier: string = "Japan Post"
): Promise<{ success: boolean; hasAlert: boolean; alertType?: string | null; error?: string }> {
  if (!trackingNumber || !isValidJapanPostTrackingNumber(trackingNumber)) {
    return { success: false, hasAlert: false, error: "Invalid tracking number" };
  }

  const db = await getDb();
  if (!db) return { success: false, hasAlert: false, error: "DB not available" };

  try {
    const tracking = await fetchJapanPostTracking(trackingNumber);
    const events = tracking?.events || [];
    const eventsJson = JSON.stringify(events);

    const alertResult = detectAlert(events);

    // 기존 캐시 조회
    const existing = await db
      .select()
      .from(shipmentTrackingCache)
      .where(eq(shipmentTrackingCache.trackingNumber, trackingNumber))
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      // 경고가 새로 발생했고 아직 알림을 보내지 않은 경우
      const shouldNotify =
        alertResult.hasAlert &&
        (!existing[0].alertNotifiedAt || !existing[0].hasAlert);

      await db
        .update(shipmentTrackingCache)
        .set({
          eventsJson,
          status: tracking?.status || null,
          currentLocation: tracking?.currentLocation || null,
          hasAlert: alertResult.hasAlert,
          alertType: alertResult.alertType,
          alertDescription: alertResult.alertDescription,
          alertNotifiedAt: shouldNotify ? now : existing[0].alertNotifiedAt,
          lastSyncedAt: now,
          syncError: null,
        })
        .where(eq(shipmentTrackingCache.trackingNumber, trackingNumber));

      if (shouldNotify) {
        await sendAlertNotification(trackingNumber, alertResult);
      }
    } else {
      // 신규 삽입
      await db.insert(shipmentTrackingCache).values({
        trackingNumber,
        carrier,
        eventsJson,
        status: tracking?.status || null,
        currentLocation: tracking?.currentLocation || null,
        hasAlert: alertResult.hasAlert,
        alertType: alertResult.alertType,
        alertDescription: alertResult.alertDescription,
        alertNotifiedAt: alertResult.hasAlert ? now : null,
        lastSyncedAt: now,
        syncError: null,
      });

      if (alertResult.hasAlert) {
        await sendAlertNotification(trackingNumber, alertResult);
      }
    }

    return { success: true, hasAlert: alertResult.hasAlert, alertType: alertResult.alertType };
  } catch (err: any) {
    // 에러 기록
    const errorMsg = err?.message || String(err);
    try {
      const existing = await db
        .select({ id: shipmentTrackingCache.id })
        .from(shipmentTrackingCache)
        .where(eq(shipmentTrackingCache.trackingNumber, trackingNumber))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(shipmentTrackingCache)
          .set({ syncError: errorMsg, lastSyncedAt: new Date() })
          .where(eq(shipmentTrackingCache.trackingNumber, trackingNumber));
      } else {
        await db.insert(shipmentTrackingCache).values({
          trackingNumber,
          carrier,
          eventsJson: null,
          hasAlert: false,
          lastSyncedAt: new Date(),
          syncError: errorMsg,
        });
      }
    } catch {}

    return { success: false, hasAlert: false, error: errorMsg };
  }
}

// ─── 관리자 알림 발송 ─────────────────────────────────────────────────────────
async function sendAlertNotification(
  trackingNumber: string,
  alert: { alertType: string | null; alertDescription: string | null }
) {
  const typeLabel =
    ALERT_PATTERNS.find((p) => p.type === alert.alertType)?.label || alert.alertType || "경고";

  try {
    await notifyOwner({
      title: `⚠️ 배송 경고: ${typeLabel} [${trackingNumber}]`,
      content: `송장번호 **${trackingNumber}**에서 경고 이벤트가 감지되었습니다.\n\n**유형:** ${typeLabel}\n**내용:** ${alert.alertDescription || "-"}\n\n관리자 페이지에서 확인하세요.`,
    });
  } catch (err) {
    console.error("[TrackingCache] Failed to send alert notification:", err);
  }
}

// ─── 전체 배송중 송장번호 일괄 동기화 (야간 스케줄러용) ──────────────────────
export async function syncAllActiveTrackings(): Promise<{
  total: number;
  success: number;
  failed: number;
  alerts: number;
}> {
  console.log("[TrackingCacheSync] Starting full sync of active shipments...");

  const db = await getDb();
  if (!db) {
    console.error("[TrackingCacheSync] DB not available");
    return { total: 0, success: 0, failed: 0, alerts: 0 };
  }

  // 배송중 상태 shipments에서 송장번호 조회
  const activeShipments = await db
    .select({
      trackingNumber: shipments.trackingNumber,
      carrier: shipments.carrier,
    })
    .from(shipments)
    .where(
      inArray(shipments.status, ["picked_up", "in_transit", "out_for_delivery"])
    );

  // 중복 제거
  const uniqueTrackings = Array.from(
    new Map(
      activeShipments
        .filter((s) => s.trackingNumber && s.trackingNumber.trim())
        .map((s) => [s.trackingNumber!, s])
    ).values()
  );

  console.log(`[TrackingCacheSync] Found ${uniqueTrackings.length} active tracking numbers`);

  let success = 0;
  let failed = 0;
  let alerts = 0;

  // 순차 처리 (일본우편 서버 과부하 방지: 500ms 간격)
  for (const shipment of uniqueTrackings) {
    const result = await syncTrackingCache(
      shipment.trackingNumber!,
      shipment.carrier || "Japan Post"
    );

    if (result.success) {
      success++;
      if (result.hasAlert) alerts++;
    } else {
      failed++;
    }

    // 500ms 딜레이 (서버 과부하 방지)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(
    `[TrackingCacheSync] Sync complete: ${success} success, ${failed} failed, ${alerts} alerts`
  );

  return { total: uniqueTrackings.length, success, failed, alerts };
}

// ─── DB 캐시 조회 (모달용) ────────────────────────────────────────────────────
export async function getTrackingCache(trackingNumber: string) {
  const db = await getDb();
  if (!db) return null;

  const cached = await db
    .select()
    .from(shipmentTrackingCache)
    .where(eq(shipmentTrackingCache.trackingNumber, trackingNumber))
    .limit(1);

  if (!cached.length) return null;

  const row = cached[0];
  let events: any[] = [];
  try {
    events = row.eventsJson ? JSON.parse(row.eventsJson) : [];
  } catch {}

  return {
    ...row,
    events,
  };
}
