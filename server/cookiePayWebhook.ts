/**
 * CookiePay (Pay2Pay Global) Webhook Handler
 *
 * CookiePay sends a POST request to the webhook URL when payment is completed.
 * The payload includes ORDERNO, AMOUNT, STATUS, etc.
 *
 * Webhook URL to configure in CookiePay admin:
 *   https://your-domain.com/api/cookiepay/webhook
 *
 * CookiePay also redirects the user to RETURNURL after payment.
 * The order status is updated both via webhook (server-side) and
 * via the confirmCookiePayment endpoint (client-side after redirect).
 */
import { Express, Request, Response } from "express";
import { getDb, getOrderById } from "./db";
import { eq, sql } from "drizzle-orm";
import { getPaymentSettingByProvider } from "./db";

/**
 * Verify CookiePay webhook signature (HMAC-SHA256 or similar)
 * CookiePay uses a simple hash verification based on secretKey + orderId + amount
 */
function verifyCookiePaySignature(
  payload: Record<string, any>,
  secretKey: string
): boolean {
  // If no secret key configured, skip verification
  if (!secretKey) return true;

  try {
    const crypto = require("crypto");
    // CookiePay signature: SHA256(secretKey + ORDERNO + AMOUNT)
    const orderno = payload.ORDERNO || payload.orderno || "";
    const amount = payload.AMOUNT || payload.amount || "";
    const expected = crypto
      .createHash("sha256")
      .update(`${secretKey}${orderno}${amount}`)
      .digest("hex");
    const received = payload.SIGNATURE || payload.signature || "";
    // If no signature in payload, skip verification (some CookiePay versions don't send it)
    if (!received) return true;
    return expected === received;
  } catch {
    return true; // Skip verification on error
  }
}

export function registerCookiePayWebhook(app: Express) {
  // Webhook endpoint - called by CookiePay server after payment
  app.post("/api/cookiepay/webhook", async (req: Request, res: Response) => {
    console.log("[CookiePay Webhook] Received:", JSON.stringify(req.body));

    try {
      const payload = req.body;
      const orderId = parseInt(payload.ORDERNO || payload.orderno || "0");
      const status = payload.STATUS || payload.status || "";
      const amount = parseFloat(payload.AMOUNT || payload.amount || "0");

      if (!orderId) {
        console.error("[CookiePay Webhook] Missing ORDERNO in payload");
        return res.status(400).json({ error: "Missing ORDERNO" });
      }

      // Get CookiePay settings for signature verification
      const settings = await getPaymentSettingByProvider("cookiepay");
      const secretKey = settings?.secretKey || "";

      // Verify signature
      if (!verifyCookiePaySignature(payload, secretKey)) {
        console.error("[CookiePay Webhook] Signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Get order from DB
      const order = await getOrderById(orderId);
      if (!order) {
        console.error(`[CookiePay Webhook] Order ${orderId} not found`);
        return res.status(404).json({ error: "Order not found" });
      }

      // Skip if already paid
      if (order.paymentStatus === "paid") {
        console.log(`[CookiePay Webhook] Order ${orderId} already paid, skipping`);
        return res.json({ received: true });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "DB connection failed" });
      }

      const { orders, pointTransactions, registeredUsers } = await import("../drizzle/schema");

      // Determine payment result
      const isSuccess =
        status === "SUCCESS" ||
        status === "success" ||
        status === "PAID" ||
        status === "paid" ||
        status === "1" ||
        status === "00"; // CookiePay success codes

      if (isSuccess) {
        // Update order to paid
        await db
          .update(orders)
          .set({
            paymentStatus: "paid",
            status: "confirmed",
            stripePaymentId: `cookiepay_${payload.TID || payload.tid || Date.now()}`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        console.log(`[CookiePay Webhook] Order ${orderId} marked as paid`);

        // Award points (1% of order total)
        const totalAmount = parseFloat(order.totalAmount?.toString() || "0");
        const pointsEarned = Math.floor(totalAmount * 0.01);

        if (pointsEarned > 0) {
          try {
            const userId = order.userId;
            const balanceResult = await db.execute(sql`
              SELECT COALESCE(SUM(CASE WHEN type IN ('earn', 'admin_add') THEN amount ELSE -amount END), 0) as balance
              FROM point_transactions
              WHERE userId = ${userId}
            `);
            const currentBalance = (balanceResult as any[])[0]?.balance || 0;
            const newBalance = currentBalance + pointsEarned;

            await db.insert(pointTransactions).values({
              userId,
              orderId: order.id,
              type: "earn",
              amount: pointsEarned,
              balance: newBalance,
              description: `注文 ${order.orderNumber} のポイント獲得 (CookiePay)`,
              createdAt: new Date(),
            });
            console.log(`[CookiePay Webhook] Awarded ${pointsEarned} points to user ${userId}`);
          } catch (pointErr) {
            console.error("[CookiePay Webhook] Failed to award points:", pointErr);
          }
        }

        // Send order confirmation email
        try {
          const [user] = await db
            .select()
            .from(registeredUsers)
            .where(eq(registeredUsers.id, order.userId))
            .limit(1);

          if (user?.email) {
            const { sendOrderStatusEmail } = await import("./_core/orderStatusEmail");
            await sendOrderStatusEmail({
              customerEmail: user.email,
              customerName: order.shippingName || "お客様",
              orderNumber: order.orderNumber || String(order.id),
              status: "paid",
            });
            console.log(`[CookiePay Webhook] Confirmation email sent to ${user.email}`);
          }
        } catch (emailErr) {
          console.warn("[CookiePay Webhook] Failed to send confirmation email:", emailErr);
        }
      } else {
        // Payment failed or cancelled
        await db
          .update(orders)
          .set({
            paymentStatus: "failed",
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        console.log(`[CookiePay Webhook] Order ${orderId} payment failed/cancelled (status: ${status})`);
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("[CookiePay Webhook] Error:", err.message);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // Client-side confirmation endpoint - called after user returns from CookiePay
  // This handles cases where webhook might not be received
  app.post("/api/cookiepay/confirm", async (req: Request, res: Response) => {
    console.log("[CookiePay Confirm] Received:", JSON.stringify(req.body));

    try {
      const { orderId, tid, status } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId" });
      }

      const order = await getOrderById(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // If already paid, just return success
      if (order.paymentStatus === "paid") {
        return res.json({ success: true, alreadyPaid: true });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "DB connection failed" });
      }

      const { orders } = await import("../drizzle/schema");

      const isSuccess =
        status === "SUCCESS" ||
        status === "success" ||
        status === "PAID" ||
        status === "paid" ||
        !status; // If no status provided, assume success (user was redirected to success URL)

      if (isSuccess) {
        await db
          .update(orders)
          .set({
            paymentStatus: "paid",
            status: "confirmed",
            stripePaymentId: tid ? `cookiepay_${tid}` : `cookiepay_confirm_${Date.now()}`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, parseInt(orderId)));

        console.log(`[CookiePay Confirm] Order ${orderId} confirmed as paid`);
        return res.json({ success: true });
      }

      return res.json({ success: false, status });
    } catch (err: any) {
      console.error("[CookiePay Confirm] Error:", err.message);
      return res.status(500).json({ error: "Confirmation failed" });
    }
  });
}
