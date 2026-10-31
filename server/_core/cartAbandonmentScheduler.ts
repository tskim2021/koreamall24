/**
 * 장바구니 이탈 알림 크론잡
 * - 24시간 이상 결제되지 않은 장바구니 보유 사용자에게 자동 알림 발송
 * - 동일 사용자에게 7일 이내 중복 발송 방지
 */
import cron from "node-cron";
import { getDb } from "../db";
import { cartItems, userNotifications } from "../../drizzle/schema";
import { and, eq, lt, gt, like } from "drizzle-orm";
import { notifyUserSSE } from "./sseManager";

const ABANDON_HOURS = 24;         // 몇 시간 후 이탈로 판단
const COOLDOWN_DAYS = 7;          // 동일 사용자 재발송 최소 간격 (일)

async function runCartAbandonmentCheck() {
  const db = await getDb();
  if (!db) return;

  try {
    const cutoff = new Date(Date.now() - ABANDON_HOURS * 60 * 60 * 1000);
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    // 24시간 이상 된 장바구니 보유 사용자 조회 (userId 기준 그룹)
    const abandonedUsers = await db
      .selectDistinct({ userId: cartItems.userId })
      .from(cartItems)
      .where(lt(cartItems.updatedAt, cutoff));

    if (abandonedUsers.length === 0) return;

    for (const { userId } of abandonedUsers) {
      if (!userId) continue;

      // 최근 7일 이내 동일 유형 알림 발송 여부 확인 (중복 방지)
      const recentNotif = await db
        .select({ id: userNotifications.id })
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.type, "order"),
            gt(userNotifications.createdAt, cooldownCutoff),
            like(userNotifications.title, '%カート%')
          )
        )
        .limit(1);

      if (recentNotif.length > 0) continue; // 이미 발송됨

      // 장바구니 상품 수 조회
      const items = await db
        .select({ id: cartItems.id })
        .from(cartItems)
        .where(eq(cartItems.userId, userId));

      if (items.length === 0) continue;

      const title = "カートに商品が残っています！";
      const message = `${items.length}点の商品がカートに入ったままです。お早めにご購入ください。`;
      const link = "/cart";

      // 인앱 알림 삽입
      await db.insert(userNotifications).values({
        userId,
        type: "order",
        title,
        message,
        link,
        isRead: false,
      });

      // SSE 실시간 푸시
      notifyUserSSE(userId, { type: "new_notification", title, message, link });
    }

    if (abandonedUsers.length > 0) {
      console.log(`[CartAbandonment] ${abandonedUsers.length}명 대상 확인 완료`);
    }
  } catch (err) {
    console.error("[CartAbandonment] 오류:", err);
  }
}

export function startCartAbandonmentScheduler() {
  // 매 2시간마다 실행
  cron.schedule("0 */2 * * *", runCartAbandonmentCheck);
  console.log("[CartAbandonment] 장바구니 이탈 알림 스케줄러 시작 (2시간 간격)");
}
