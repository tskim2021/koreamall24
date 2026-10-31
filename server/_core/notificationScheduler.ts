/**
 * 알림 예약 발송 크론잡 (Phase 3)
 * - 1분마다 pending 상태의 예약 알림을 확인하고 발송
 */
import { getDb } from "../db";
import { notifyUserSSE } from "./sseManager";

let schedulerStarted = false;

export function startNotificationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log("[NotificationScheduler] Started — checks every 60 seconds");

  setInterval(async () => {
    try {
      await processPendingSchedules();
    } catch (err) {
      console.error("[NotificationScheduler] Error:", err);
    }
  }, 60_000);

  // 시작 직후 한 번 실행
  setTimeout(() => processPendingSchedules().catch(console.error), 5_000);
}

async function processPendingSchedules() {
  const database = await getDb();
  if (!database) return;

  const { notificationSchedules, userNotifications, users } = await import("../../drizzle/schema");
  const { and, eq, lte, sql } = await import("drizzle-orm");

  const now = new Date();

  // 발송 시각이 지난 pending 예약 조회
  const pending = await database
    .select()
    .from(notificationSchedules)
    .where(
      and(
        eq(notificationSchedules.status, "pending"),
        lte(notificationSchedules.scheduledAt, now)
      )
    )
    .limit(10);

  if (pending.length === 0) return;

  console.log(`[NotificationScheduler] Processing ${pending.length} pending schedules`);

  for (const schedule of pending) {
    try {
      let targetUserIds: number[] = [];

      if (schedule.targetType === "all") {
        const allUsers = await database.select({ id: users.id }).from(users);
        targetUserIds = allUsers.map(u => u.id);
      } else if (schedule.targetType === "individual" && schedule.targetUserIds) {
        targetUserIds = schedule.targetUserIds.split(",").map(s => parseInt(s.trim())).filter(Boolean);
      } else if (schedule.targetType === "segment" && schedule.targetSegment) {
        // 세그먼트별 사용자 조회 (예: tier, recent_order 등)
        const allUsers = await database.select({ id: users.id }).from(users);
        targetUserIds = allUsers.map(u => u.id);
      }

      if (targetUserIds.length === 0) {
        await database.update(notificationSchedules)
          .set({ status: "sent", sentCount: 0 })
          .where(eq(notificationSchedules.id, schedule.id));
        continue;
      }

      // 알림 일괄 삽입
      await database.insert(userNotifications).values(
        targetUserIds.map(userId => ({
          userId,
          type: schedule.type,
          title: schedule.title,
          message: schedule.message,
          link: schedule.link,
        }))
      );

      // SSE 실시간 알림 전송
      for (const userId of targetUserIds) {
        notifyUserSSE(userId, {
          type: "new_notification",
          title: schedule.title,
          message: schedule.message,
          link: schedule.link ?? undefined,
        });
      }

      // 상태 업데이트
      await database.update(notificationSchedules)
        .set({ status: "sent", sentCount: targetUserIds.length })
        .where(eq(notificationSchedules.id, schedule.id));

      console.log(`[NotificationScheduler] Schedule #${schedule.id} sent to ${targetUserIds.length} users`);
    } catch (err) {
      console.error(`[NotificationScheduler] Failed to process schedule #${schedule.id}:`, err);
      await database.update(notificationSchedules)
        .set({ status: "failed" })
        .where(eq(notificationSchedules.id, schedule.id));
    }
  }
}
