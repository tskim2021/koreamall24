import type { Request, Response } from "express";
import { getDb, upsertSiteSetting } from "./db";
import { registeredUsers, orders } from "../drizzle/schema";
import { and, lte, sql, eq } from "drizzle-orm";
import { addPointsToUser } from "./db";
import { syncAllShipments } from "./_core/shipmentStatusSync";

export function registerScheduledRoutes(app: any) {
  /**
   * POST /api/scheduled/check-dormant-members
   * Sends promotional emails to members who haven't logged in for 6 months.
   * Runs daily.
   */
  app.post("/api/scheduled/check-dormant-members", async (req: Request, res: Response) => {
    const isAuth = await authenticateHeartbeat(req, res);
    if (!isAuth) return;
    try {
      const d = await getDb();
      if (!d) return res.status(500).json({ error: "Database not available" });
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      // Find dormant members: last login was more than 6 months ago
      const dormantUsers = await d.select({
        id: registeredUsers.id,
        email: registeredUsers.email,
        nameKanji: registeredUsers.nameKanji,
        lastSignedIn: registeredUsers.lastSignedIn,
      }).from(registeredUsers)
        .where(
          and(
            lte(registeredUsers.lastSignedIn, sixMonthsAgo),
            sql`${registeredUsers.lastSignedIn} IS NOT NULL`
          )
        );
      let emailsSent = 0;
      let emailsFailed = 0;
      for (const user of dormantUsers) {
        if (!user.email) continue;
        try {
          // Use Resend API directly for dormant member emails
          const resendApiKey = process.env.RESEND_API_KEY;
          if (resendApiKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'ココくすり <noreply@cocokusuri.com>',
                to: user.email,
                subject: '【ココくすり】お久しぶりです！お得なクーポンをお届けします',
                html: `<h2>お久しぶりです、${user.nameKanji || 'お客'}様！</h2><p>最近ココくすりをご利用いただいていないようです。</p><p>お客様のために特別なクーポンをご用意しました。</p><div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;text-align:center;"><p style="font-size:18px;font-weight:bold;color:#e53e3e;">再訪問限定 10%OFF クーポン</p><p style="font-size:24px;font-weight:bold;color:#2d3748;letter-spacing:4px;">COMEBACK10</p><p style="font-size:12px;color:#718096;">※ 有効期限: 発行日から14日間</p></div><p>新商品も続々入荷中です。ぜひまたお立ち寄りください。</p>`,
              }),
            });
          }
          emailsSent++;
        } catch (e) {
          console.error(`[Scheduled] Failed to send dormant email to ${user.email}:`, e);
          emailsFailed++;
        }
      }
      console.log(`[Scheduled] Dormant member check complete: ${dormantUsers.length} dormant, ${emailsSent} emails sent, ${emailsFailed} failed`);
      return res.json({
        success: true,
        dormantCount: dormantUsers.length,
        emailsSent,
        emailsFailed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Scheduled] Dormant member check failed:", error);
      return res.status(500).json({ error: "Dormant member check failed" });
    }
  });
  /**
   * POST /api/scheduled/auto-complete-orders
   * Auto-completes orders that have been in 'delivered' status for more than 5 days.
   * Awards points to users upon completion. Runs daily.
   */
  app.post("/api/scheduled/auto-complete-orders", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "DB not available" });
      // Find delivered orders where deliveredAt is more than 5 days ago
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const pendingOrders = await db.select().from(orders)
        .where(
          and(
            eq(orders.status, 'delivered'),
            lte(orders.deliveredAt, fiveDaysAgo)
          )
        );
      let completedCount = 0;
      let pointsAwardedCount = 0;
      for (const order of pendingOrders) {
        try {
          // Mark as completed
          await db.update(orders).set({
            status: 'completed',
            completedAt: new Date(),
          }).where(eq(orders.id, order.id));
          // Award points if not already added
          if (!order.pointsAdded && order.pointsEarned > 0) {
            await addPointsToUser(
              order.userId,
              order.pointsEarned,
              `注文自動完了ポイント積立 (注文番号: ${order.orderNumber})`,
              order.id
            );
            await db.update(orders).set({ pointsAdded: 1 }).where(eq(orders.id, order.id));
            pointsAwardedCount++;
          }
          completedCount++;
          console.log(`[Scheduled] Auto-completed order ${order.orderNumber} (userId: ${order.userId})`);
        } catch (orderErr) {
          console.error(`[Scheduled] Failed to auto-complete order ${order.id}:`, orderErr);
        }
      }
      console.log(`[Scheduled] Auto-complete orders: ${completedCount} completed, ${pointsAwardedCount} points awarded`);
      return res.json({
        success: true,
        completedCount,
        pointsAwardedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Scheduled] Auto-complete orders failed:", error);
      return res.status(500).json({ error: "Auto-complete orders failed", details: String(error) });
    }
  });

  /**
   * POST /api/scheduled/sync-tracking-with-alerts
   * Syncs shipment tracking data and triggers alerts for stalled shipments.
   * - Customs inquiry: Alert after 24 hours
   * - Absence: Alert after 48 hours
   * Runs daily at 3:00 AM UTC (12:00 PM KST)
   */
  app.post("/api/scheduled/sync-tracking-with-alerts", async (req: Request, res: Response) => {
    try {
      console.log("[Scheduled] Tracking sync with alerts started");
      const results = await syncAllShipments();
      const successCount = results.filter(r => r.updated || r.deliveryCompleted).length;
      const failedCount = results.filter(r => !r.updated && !r.deliveryCompleted && r.message.includes('Error')).length;
      console.log(`[Scheduled] Tracking sync complete: ${results.length} total, ${successCount} updated, ${failedCount} failed`);
      const syncTimestamp = new Date().toISOString();
      await upsertSiteSetting('LAST_TRACKING_SYNC_AT', syncTimestamp, '마지막 배송 정보 자동 업데이트 시간');
      return res.json({
        success: true,
        totalCount: results.length,
        successCount,
        failedCount,
        timestamp: syncTimestamp,
      });
    } catch (error) {
      console.error("[Scheduled] Tracking sync with alerts failed:", error);
      return res.status(500).json({ error: "Tracking sync failed", details: String(error) });
    }
  });

  /**
   * POST /api/scheduled/sync-tracking-cache
   * 배송중 주문의 송장 추적 정보를 DB에 동기화 (한국시간 자정 실행)
   */
  app.post("/api/scheduled/sync-tracking-cache", async (req: Request, res: Response) => {
    try {
      console.log("[Scheduled] Nightly tracking cache sync started (KST midnight)");
      const results = await syncAllShipments();
      const successCount = results.filter(r => r.updated || r.deliveryCompleted).length;
      const deliveredCount = results.filter(r => r.deliveryCompleted).length;
      const failedCount = results.filter(r => !r.updated && !r.deliveryCompleted && r.message.includes('Error')).length;
      console.log(`[Scheduled] Nightly sync complete: ${results.length} total, ${successCount} updated, ${deliveredCount} delivered, ${failedCount} failed`);
      const syncTimestamp = new Date().toISOString();
      await upsertSiteSetting('LAST_TRACKING_SYNC_AT', syncTimestamp, '마지막 배송 정보 자동 업데이트 시간');
      return res.json({
        success: true,
        totalCount: results.length,
        successCount,
        deliveredCount,
        failedCount,
        timestamp: syncTimestamp,
      });
    } catch (error) {
      console.error("[Scheduled] Nightly tracking cache sync failed:", error);
      return res.status(500).json({ error: "Nightly tracking sync failed", details: String(error) });
    }
  });
}

async function authenticateHeartbeat(req: Request, res: Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const heartbeatSecret = process.env.HEARTBEAT_SECRET;
  if (!heartbeatSecret) {
    console.warn("[Scheduled] HEARTBEAT_SECRET not configured");
    return false;
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const token = authHeader.slice(7);
  if (token !== heartbeatSecret) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}
