import { getOrdersForReviewReminder } from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * Send review reminders for orders delivered 3 days ago
 * This script should be run daily via cron or scheduled task
 */
export async function sendReviewReminders() {
  console.log("[ReviewReminder] Starting review reminder job...");

  try {
    const ordersToRemind = await getOrdersForReviewReminder();

    if (ordersToRemind.length === 0) {
      console.log("[ReviewReminder] No orders to remind");
      return;
    }

    console.log(`[ReviewReminder] Found ${ordersToRemind.length} orders to remind`);

    for (const orderData of ordersToRemind) {
      const { order, user, items } = orderData;

      // Send notification to owner (can be extended to send email to user)
      const productNames = items.map((item: any) => item.productName).join(", ");
      
      await notifyOwner({
        title: "リビュー作成リマインダー",
        content: `ユーザー ${user.name || user.email} (注文番号: ${order.orderNumber}) の配送完了から3日が経過しました。\n\n商品: ${productNames}\n\nリビューの作成を促してください。`,
      });

      console.log(`[ReviewReminder] Sent reminder for order ${order.orderNumber}`);
    }

    console.log("[ReviewReminder] Review reminder job completed");
  } catch (error) {
    console.error("[ReviewReminder] Failed to send review reminders:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendReviewReminders()
    .then(() => {
      console.log("[ReviewReminder] Job finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[ReviewReminder] Job failed:", error);
      process.exit(1);
    });
}
