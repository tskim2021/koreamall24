/**
 * Review Reminder Scheduler
 * Sends reminder emails to customers who haven't written reviews after delivery.
 * - 7-day reminder: Sent 7 days after delivery completion
 * - 30-day reminder: Sent 30 days after delivery completion (final reminder)
 * 
 * Runs automatically on server start via cron-like scheduling (daily at 10:00 AM JST).
 */

import { getDb } from './db';
import { orders, orderItems, users, siteSettings } from '../drizzle/schema';
import { eq, and, isNull, isNotNull, lt, gte, sql } from 'drizzle-orm';
import { sendReviewReminderEmail } from './_core/emailService';

// ============ Helper: Get review points from siteSettings ============

async function getReviewPoints(): Promise<number> {
  const db = await getDb();
  if (!db) return 1500;

  try {
    const result = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, 'REVIEW_POINTS'))
      .limit(1);

    return result.length > 0 && result[0].value
      ? parseInt(result[0].value, 10) || 1500
      : 1500;
  } catch {
    return 1500;
  }
}

// ============ 7-Day Review Reminder ============

export async function send7DayReviewReminders() {
  console.log('[ReviewReminder] Starting 7-day reminder check...');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('[ReviewReminder] Database not available, skipping 7-day reminders');
      return { success: false, error: 'Database not available' };
    }

    // Find orders delivered more than 7 days ago with unreviewed items that haven't received a reminder
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const ordersNeedingReminder = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.createdAt,
        userId: orders.userId,
        userEmail: users.email,
        userName: users.name,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.status, 'delivered'),
          isNull(orderItems.reviewSubmitted),
          isNull(orderItems.reviewReminderSent),
          lt(orders.deliveredAt, sevenDaysAgo)
        )
      )
      .groupBy(orders.id, orders.orderNumber, orders.createdAt, orders.userId, users.email, users.name, orders.deliveredAt);

    console.log(`[ReviewReminder] Found ${ordersNeedingReminder.length} orders needing 7-day reminders`);

    const reviewPoints = await getReviewPoints();
    let sentCount = 0;

    for (const order of ordersNeedingReminder) {
      try {
        const items = await db
          .select()
          .from(orderItems)
          .where(
            and(
              eq(orderItems.orderId, order.orderId),
              isNull(orderItems.reviewSubmitted)
            )
          );

        if (items.length === 0) continue;

        const emailResult = await sendReviewReminderEmail({
          to: order.userEmail || '',
          userName: order.userName || 'お客様',
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          orderDate: order.orderDate,
          orderItems: items.map(item => ({
            productId: item.productId,
            productNameJa: item.productNameJa,
            productImageUrl: item.productImageUrl,
            orderItemId: item.id,
          })),
          reviewPoints,
          reminderType: '7days',
        });

        if (emailResult.success) {
          // Mark reminder as sent
          await db
            .update(orderItems)
            .set({ reviewReminderSent: new Date() })
            .where(
              and(
                eq(orderItems.orderId, order.orderId),
                isNull(orderItems.reviewSubmitted)
              )
            );

          sentCount++;
          console.log(`[ReviewReminder] 7-day reminder sent for order ${order.orderNumber}`);
        } else {
          console.error(`[ReviewReminder] Failed to send 7-day reminder for order ${order.orderNumber}:`, emailResult.error);
        }
      } catch (error) {
        console.error(`[ReviewReminder] Error processing order ${order.orderNumber}:`, error);
      }
    }

    console.log(`[ReviewReminder] 7-day reminder check completed. Sent: ${sentCount}/${ordersNeedingReminder.length}`);
    return { success: true, count: sentCount };
  } catch (error) {
    console.error('[ReviewReminder] Error in 7-day reminder check:', error);
    return { success: false, error: String(error) };
  }
}

// ============ 30-Day Review Reminder (Final) ============

export async function send30DayReviewReminders() {
  console.log('[ReviewReminder] Starting 30-day reminder check...');

  try {
    const db = await getDb();
    if (!db) {
      console.warn('[ReviewReminder] Database not available, skipping 30-day reminders');
      return { success: false, error: 'Database not available' };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find orders delivered 30+ days ago, with unreviewed items that already received the 7-day reminder
    const ordersNeedingReminder = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.createdAt,
        userId: orders.userId,
        userEmail: users.email,
        userName: users.name,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.status, 'delivered'),
          isNull(orderItems.reviewSubmitted),
          isNotNull(orderItems.reviewReminderSent), // Already received 7-day reminder
          lt(orders.deliveredAt, thirtyDaysAgo)
        )
      )
      .groupBy(orders.id, orders.orderNumber, orders.createdAt, orders.userId, users.email, users.name, orders.deliveredAt);

    console.log(`[ReviewReminder] Found ${ordersNeedingReminder.length} orders needing 30-day reminders`);

    const reviewPoints = await getReviewPoints();
    let sentCount = 0;

    for (const order of ordersNeedingReminder) {
      try {
        const items = await db
          .select()
          .from(orderItems)
          .where(
            and(
              eq(orderItems.orderId, order.orderId),
              isNull(orderItems.reviewSubmitted),
              isNotNull(orderItems.reviewReminderSent)
            )
          );

        if (items.length === 0) continue;

        // Check if 30-day reminder was already sent (prevent duplicates)
        // We use a simple check: if reviewReminderSent is more than 20 days old, it was the 7-day reminder
        const firstItem = items[0];
        if (firstItem.reviewReminderSent) {
          const reminderAge = Date.now() - new Date(firstItem.reviewReminderSent).getTime();
          const daysSinceReminder = reminderAge / (1000 * 60 * 60 * 24);
          if (daysSinceReminder < 20) {
            // 7-day reminder was sent less than 20 days ago, skip 30-day
            continue;
          }
        }

        const emailResult = await sendReviewReminderEmail({
          to: order.userEmail || '',
          userName: order.userName || 'お客様',
          orderNumber: order.orderNumber,
          orderId: order.orderId,
          orderDate: order.orderDate,
          orderItems: items.map(item => ({
            productId: item.productId,
            productNameJa: item.productNameJa,
            productImageUrl: item.productImageUrl,
            orderItemId: item.id,
          })),
          reviewPoints,
          reminderType: '30days',
        });

        if (emailResult.success) {
          sentCount++;
          console.log(`[ReviewReminder] 30-day final reminder sent for order ${order.orderNumber}`);
        } else {
          console.error(`[ReviewReminder] Failed to send 30-day reminder for order ${order.orderNumber}:`, emailResult.error);
        }
      } catch (error) {
        console.error(`[ReviewReminder] Error processing order ${order.orderNumber}:`, error);
      }
    }

    console.log(`[ReviewReminder] 30-day reminder check completed. Sent: ${sentCount}/${ordersNeedingReminder.length}`);
    return { success: true, count: sentCount };
  } catch (error) {
    console.error('[ReviewReminder] Error in 30-day reminder check:', error);
    return { success: false, error: String(error) };
  }
}

// ============ Run All Reminder Checks ============

export async function runReviewReminderChecks() {
  console.log('[ReviewReminder] Starting all reminder checks...');

  const [result7day, result30day] = await Promise.allSettled([
    send7DayReviewReminders(),
    send30DayReviewReminders(),
  ]);

  const summary = {
    '7day': result7day.status === 'fulfilled' ? result7day.value : { success: false, error: String(result7day.reason) },
    '30day': result30day.status === 'fulfilled' ? result30day.value : { success: false, error: String(result30day.reason) },
  };

  console.log('[ReviewReminder] All reminder checks completed:', JSON.stringify(summary));
  return summary;
}

// ============ Cron Scheduler ============

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the review reminder scheduler.
 * Runs daily at 10:00 AM JST (01:00 UTC).
 * Also runs once on startup (after a 30-second delay to let DB connect).
 */
export function startReviewReminderScheduler() {
  if (schedulerInterval) {
    console.log('[ReviewReminder] Scheduler already running');
    return;
  }

  console.log('[ReviewReminder] Scheduler started - daily at 10:00 AM JST');

  // Check every hour if it's time to run
  schedulerInterval = setInterval(async () => {
    const now = new Date();
    // Convert to JST (UTC+9)
    const jstHour = (now.getUTCHours() + 9) % 24;
    const jstMinute = now.getUTCMinutes();

    // Run at 10:00 AM JST (= 01:00 UTC)
    if (jstHour === 10 && jstMinute < 5) {
      console.log('[ReviewReminder] Scheduled run triggered at 10:00 AM JST');
      await runReviewReminderChecks();
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  // Initial run after 30 seconds (let DB connect first)
  setTimeout(async () => {
    console.log('[ReviewReminder] Initial run on startup...');
    await runReviewReminderChecks();
  }, 30 * 1000);
}

/**
 * Stop the review reminder scheduler.
 */
export function stopReviewReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ReviewReminder] Scheduler stopped');
  }
}
