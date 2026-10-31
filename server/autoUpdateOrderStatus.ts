import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq, and, lt, isNull } from "drizzle-orm";

/**
 * Auto-update order status from shipped to delivered
 * This function checks orders that have been shipped for more than 7 days
 * and automatically updates their status to "delivered"
 */
export async function autoUpdateOrderStatus() {
  const db = await getDb();
  if (!db) {
    console.warn("[AutoUpdateOrderStatus] Cannot update order status: database not available");
    return;
  }

  try {
    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find orders that have been shipped for more than 7 days
    const shippedOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.status, "shipped"),
        lt(orders.shippedAt, sevenDaysAgo),
        isNull(orders.deliveredAt)
      ));

    console.log(`[AutoUpdateOrderStatus] Found ${shippedOrders.length} orders to update`);

    // Update each order to delivered status
    for (const order of shippedOrders) {
      await db
        .update(orders)
        .set({
          status: "delivered",
          deliveredAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      console.log(`[AutoUpdateOrderStatus] Updated order ${order.orderNumber} to delivered`);
    }

    console.log(`[AutoUpdateOrderStatus] Successfully updated ${shippedOrders.length} orders`);
  } catch (error) {
    console.error("[AutoUpdateOrderStatus] Failed to auto-update order status:", error);
  }
}

// Run this function periodically (e.g., daily via cron job)
// For development, you can call this function manually or set up a scheduler
