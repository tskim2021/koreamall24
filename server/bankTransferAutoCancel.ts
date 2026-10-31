/**
 * Bank Transfer Auto-Cancel Scheduler
 * Automatically cancels bank transfer orders that exceed the payment deadline.
 * Runs daily at midnight (00:00 JST).
 *
 * Logic:
 * 1. Fetch active bank_transfer payment setting to get paymentDeadlineDays
 * 2. Find orders where:
 *    - paymentMethod = 'bank_transfer'
 *    - paymentStatus = 'pending'
 *    - bankTransferConfirmedAt IS NULL (not yet confirmed)
 *    - createdAt < (now - deadlineDays)
 * 3. Update those orders: status = 'cancelled', paymentStatus = 'failed'
 * 4. Send cancellation email to each customer
 */

import { getDb } from "./db";
import { orders, users, paymentSettings } from "../drizzle/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
import { sendOrderStatusEmail } from "./_core/orderStatusEmail";

// ─── Core: Find and cancel overdue bank transfer orders ──────────────────────
export async function cancelOverdueBankTransferOrders(): Promise<{
  success: boolean;
  cancelled: number;
  errors: number;
  details: Array<{ orderId: number; orderNumber: string; email: string; status: "cancelled" | "error"; error?: string }>;
}> {
  console.log("[BankTransferAutoCancel] Starting overdue payment check...");

  const db = await getDb();
  if (!db) {
    console.warn("[BankTransferAutoCancel] Database not available, skipping.");
    return { success: false, cancelled: 0, errors: 0, details: [] };
  }

  try {
    // Step 1: Get paymentDeadlineDays from bank_transfer setting
    const settingRows = await db
      .select({ extraConfig: paymentSettings.extraConfig })
      .from(paymentSettings)
      .where(and(
        eq(paymentSettings.provider, "bank_transfer"),
        eq(paymentSettings.isActive, 1)
      ))
      .limit(1);

    const extra = (settingRows[0]?.extraConfig as Record<string, string>) || {};
    const deadlineDays = extra.paymentDeadlineDays ? parseInt(extra.paymentDeadlineDays, 10) : 0;

    if (!deadlineDays || deadlineDays <= 0) {
      console.log("[BankTransferAutoCancel] No deadline configured or deadline is 0. Skipping.");
      return { success: true, cancelled: 0, errors: 0, details: [] };
    }

    // Step 2: Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - deadlineDays);

    console.log(`[BankTransferAutoCancel] Deadline: ${deadlineDays} days. Cutoff: ${cutoffDate.toISOString()}`);

    // Step 3: Find overdue pending bank transfer orders
    const overdueOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(
        eq(orders.paymentMethod, "bank_transfer"),
        eq(orders.paymentStatus, "pending"),
        isNull(orders.bankTransferConfirmedAt),
        lt(orders.createdAt, cutoffDate)
      ));

    if (overdueOrders.length === 0) {
      console.log("[BankTransferAutoCancel] No overdue orders found.");
      return { success: true, cancelled: 0, errors: 0, details: [] };
    }

    console.log(`[BankTransferAutoCancel] Found ${overdueOrders.length} overdue order(s).`);

    let cancelled = 0;
    let errors = 0;
    const details: Array<{ orderId: number; orderNumber: string; email: string; status: "cancelled" | "error"; error?: string }> = [];

    // Step 4: Cancel each overdue order
    for (const order of overdueOrders) {
      try {
        // Update order status to cancelled
        await db.update(orders).set({
          status: "cancelled",
          paymentStatus: "failed",
          adminNotes: `[자동취소] 무통장 입금 기한(${deadlineDays}일) 초과로 자동 취소됨. (${new Date().toISOString()})`,
        }).where(eq(orders.id, order.id));

        // Send cancellation email to customer
        if (order.userEmail) {
          try {
            await sendOrderStatusEmail({
              customerEmail: order.userEmail,
              customerName: order.userName || "お客様",
              orderNumber: order.orderNumber || String(order.id),
              status: "cancelled",
            });
          } catch (emailErr) {
            console.warn(`[BankTransferAutoCancel] Email failed for order ${order.id}:`, emailErr);
            // Email failure should not block order cancellation
          }
        }

        cancelled++;
        details.push({
          orderId: order.id,
          orderNumber: order.orderNumber || String(order.id),
          email: order.userEmail || "",
          status: "cancelled",
        });

        console.log(`[BankTransferAutoCancel] Cancelled order #${order.orderNumber} (id: ${order.id})`);
      } catch (err) {
        errors++;
        details.push({
          orderId: order.id,
          orderNumber: order.orderNumber || String(order.id),
          email: order.userEmail || "",
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`[BankTransferAutoCancel] Failed to cancel order ${order.id}:`, err);
      }
    }

    console.log(`[BankTransferAutoCancel] Done. Cancelled: ${cancelled}, Errors: ${errors}`);
    return { success: true, cancelled, errors, details };
  } catch (err) {
    console.error("[BankTransferAutoCancel] Unexpected error:", err);
    return { success: false, cancelled: 0, errors: 1, details: [] };
  }
}

// ─── Scheduler: Run daily at midnight JST (15:00 UTC) ────────────────────────
export function startBankTransferAutoCancelScheduler() {
  console.log("[BankTransferAutoCancel] Scheduler started. Runs daily at midnight JST.");

  // Run immediately once on startup to catch any missed orders
  cancelOverdueBankTransferOrders().catch(err =>
    console.error("[BankTransferAutoCancel] Initial run failed:", err)
  );

  // Schedule: every day at midnight JST = 15:00 UTC
  // Using setInterval with 24h for simplicity (same pattern as other schedulers)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Calculate ms until next midnight JST (UTC+9)
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstMidnight = new Date(jstNow);
  jstMidnight.setUTCHours(0, 0, 0, 0);
  jstMidnight.setUTCDate(jstMidnight.getUTCDate() + 1);
  const msUntilMidnightJST = jstMidnight.getTime() - now.getTime() - 9 * 60 * 60 * 1000;

  // First run at next midnight JST, then every 24h
  setTimeout(() => {
    cancelOverdueBankTransferOrders().catch(err =>
      console.error("[BankTransferAutoCancel] Scheduled run failed:", err)
    );
    setInterval(() => {
      cancelOverdueBankTransferOrders().catch(err =>
        console.error("[BankTransferAutoCancel] Scheduled run failed:", err)
      );
    }, TWENTY_FOUR_HOURS);
  }, msUntilMidnightJST > 0 ? msUntilMidnightJST : TWENTY_FOUR_HOURS);
}
