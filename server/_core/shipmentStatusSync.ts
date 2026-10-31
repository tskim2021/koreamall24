/**
 * Shipment Status Synchronization Service
 * 
 * Monitors shipment status and automatically updates order status when delivery is complete
 * Also triggers review email notification when delivery is confirmed
 * 
 * Features:
 * - Automatic delivery completion detection via Japan Post tracking
 * - Customer email notification on delivery (using sendOrderStatusEmail)
 * - Review request email on delivery (using sendEmail directly)
 * - Puppeteer V2 → axios+cheerio V1 fallback for stability
 * - 30-minute sync interval
 */

import { getDb, getShipmentByOrderId, adminUpdateOrderStatus, getOrderById, getRegisteredUserById, buildFullName } from '../db';
import { fetchJapanPostTrackingV2 } from './japanPostTrackingV2';
import { fetchJapanPostTracking, type TrackingEvent } from './japanPostTracking';
import { getTrackingWithCache, invalidateTrackingCache } from './trackingCache';
import { notifyOwner } from './notification';
import { sendOrderStatusEmail } from './orderStatusEmail';
import { sendEmail } from './email';
import { orders } from '../../drizzle/schema';
import { inArray } from 'drizzle-orm';

export interface ShipmentSyncResult {
  orderId: number;
  trackingNumber: string;
  previousStatus: string;
  currentStatus: string;
  updated: boolean;
  deliveryCompleted: boolean;
  message: string;
}

/**
 * Fetch tracking with V2 (Puppeteer) first, fallback to V1 (axios+cheerio)
 */
async function fetchTrackingWithFallback(trackingNumber: string) {
  // Try V1 (axios+cheerio) first - more stable in production
  try {
    console.log(`[Shipment Sync] Fetching tracking for ${trackingNumber} using V1 (axios+cheerio)`);
    const result = await fetchJapanPostTracking(trackingNumber);
    console.log(`[Shipment Sync] V1 success for ${trackingNumber}: status=${result.status}, events=${result.events.length}`);
    return result;
  } catch (v1Error) {
    console.warn(`[Shipment Sync] V1 (axios+cheerio) failed for ${trackingNumber}, trying V2:`, 
      v1Error instanceof Error ? v1Error.message : 'Unknown error');
    
    try {
      // Fallback to V2 (Puppeteer)
      const result = await fetchJapanPostTrackingV2(trackingNumber);
      console.log(`[Shipment Sync] V2 success for ${trackingNumber}`);
      return result;
    } catch (v2Error) {
      console.error(`[Shipment Sync] Both V1 and V2 failed for ${trackingNumber}`);
      throw new Error(`Failed to fetch tracking information: ${v1Error instanceof Error ? v1Error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Save tracking events to shipment_events table
 */
/**
 * Map tracking event status to shipment event type
 */
type ShipmentEventType = 'order_placed' | 'payment_confirmed' | 'processing' | 'picked_up' | 'departed' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';

function mapStatusToEventType(status: string): ShipmentEventType {
  const statusMap: Record<string, ShipmentEventType> = {
    '引受': 'picked_up',
    '集荷': 'picked_up',
    '発送': 'departed',
    '到着': 'in_transit',
    '輸送中': 'in_transit',
    '通関中': 'in_transit',
    '税関検査のため税関へ提示': 'in_transit',
    '配達中': 'out_for_delivery',
    'ご不在のため持ち戻り': 'failed',
    '配達完了': 'delivered',
    '窓口でお渡し': 'delivered',
  };
  
  return statusMap[status] || 'in_transit';
}

async function saveTrackingEventsToDb(shipmentId: number, events: TrackingEvent[]): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { shipmentEvents } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    // Delete existing events for this shipment
    await db.delete(shipmentEvents).where(eq(shipmentEvents.shipmentId, shipmentId));

    // Insert new events
    if (events.length > 0) {
      await db.insert(shipmentEvents).values(
        events.map((event) => ({
          shipmentId,
          eventType: mapStatusToEventType(event.status),
          timestamp: event.timestamp,
          location: event.location,
          description: event.description,
        }))
      );
      console.log(`[Shipment Sync] Saved ${events.length} tracking events for shipment ${shipmentId}`);
    }
  } catch (error) {
    console.error(`[Shipment Sync] Error saving tracking events:`, error);
  }
}

/**
 * Update shipment information in database
 */
async function updateShipmentInfo(
  shipmentId: number,
  info: {
    status: string;
    currentLocation?: string;
    estimatedDeliveryDate?: Date;
  }
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const { shipments } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    const validStatus = ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'picked_up', 'failed', 'returned'] as const;
    const shipmentStatus = validStatus.includes(info.status as any) ? info.status as typeof validStatus[number] : 'in_transit';

    await db
      .update(shipments)
      .set({
        status: shipmentStatus,
        currentLocation: info.currentLocation,
        estimatedDeliveryDate: info.estimatedDeliveryDate,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));

    console.log(`[Shipment Sync] Updated shipment ${shipmentId}: status=${info.status}`);
  } catch (error) {
    console.error(`[Shipment Sync] Error updating shipment info:`, error);
  }
}

/**
 * Get customer email from order's userId
 * Tries registeredUsers first, then falls back to users table
 */
async function getCustomerEmail(userId: number): Promise<{ email: string; name: string } | null> {
  try {
    // Try registeredUsers first (has email directly)
    const registeredUser = await getRegisteredUserById(userId);
    if (registeredUser?.email) {
      return {
        email: registeredUser.email,
        name: buildFullName(registeredUser) || 'お客様',
      };
    }

    // Fallback to users table
    const db = await getDb();
    if (!db) return null;

    const { users: usersTable } = await import('../../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const result = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (result[0]?.email) {
      return {
        email: result[0].email,
        name: result[0].name || 'お客様',
      };
    }

    return null;
  } catch (error) {
    console.error(`[Shipment Sync] Error getting customer email for userId ${userId}:`, error);
    return null;
  }
}

/**
 * Send review request email to customer after delivery
 * Uses sendEmail (Manus Email Service) directly for customer-facing email
 */
async function sendCustomerReviewRequestEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  orderId: number
): Promise<boolean> {
  try {
    const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    const reviewLink = `${baseUrl}/mypage/order/${orderId}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background: #f5f5f5; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e91e63 0%, #ff6b35 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px;">ココくすり</h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">医薬品・健康商品の個人輸入</p>
          </div>

          <!-- Content -->
          <div style="background: white; padding: 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 48px;">🎉</span>
              <h2 style="color: #e91e63; margin: 12px 0 4px 0; font-size: 24px;">配達完了</h2>
              <p style="color: #666; margin: 0; font-size: 14px;">ご購入いただきありがとうございます</p>
            </div>

            <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;">${customerName} 様</p>
              <p style="margin: 0; color: #666; font-size: 14px;">
                ご注文番号 <strong style="color: #e91e63;">${orderNumber}</strong> の商品が配達されました。
              </p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <p style="color: #666; margin-bottom: 16px; font-size: 15px;">
                商品のご感想をお聞かせください。<br>
                レビューは他のお客様の参考になります。
              </p>
              <a href="${reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #e91e63 0%, #ff6b35 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(233,30,99,0.3);">
                レビューを書く ✍️
              </a>
            </div>

            <div style="background: #fff3e0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; color: #e65100; font-size: 13px;">
                💡 レビューを書くと、次回のお買い物で使えるポイントがもらえます！
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #fafafa; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              このメールは自動送信されています。ご返信いただいてもお答えできません。<br>
              ご不明な点がございましたら、サイト内のお問い合わせフォームよりご連絡ください。<br><br>
              © 2026 ココくすり All Rights Reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: customerEmail,
      subject: `【ココくすり】レビューのお願い - ${orderNumber}`,
      html,
    });

    if (result) {
      console.log(`[Shipment Sync] Review request email sent to ${customerEmail} for order ${orderNumber}`);
    }

    return result;
  } catch (error) {
    console.error(`[Shipment Sync] Error sending review request email:`, error);
    return false;
  }
}

/**
 * Sync shipment status for a specific order
 * Checks current tracking status and updates order if delivery is complete
 */
export async function syncShipmentStatus(orderId: number): Promise<ShipmentSyncResult> {
  try {
    // Get shipment information
    const shipment = await getShipmentByOrderId(orderId);
    
    if (!shipment || !shipment.trackingNumber) {
      return {
        orderId,
        trackingNumber: '',
        previousStatus: 'unknown',
        currentStatus: 'unknown',
        updated: false,
        deliveryCompleted: false,
        message: 'No shipment information found',
      };
    }

    const trackingNumber = shipment.trackingNumber;
    const previousStatus = shipment.status;

    // Fetch current tracking status with cache + V2/V1 fallback
    const trackingStatus = await getTrackingWithCache(
      trackingNumber,
      fetchTrackingWithFallback,
      30 * 60 * 1000 // 30 min cache (matching sync interval)
    );

    // Save tracking events to database
    await saveTrackingEventsToDb(shipment.id, trackingStatus.events);

    // Update shipment status and location
    await updateShipmentInfo(shipment.id, {
      status: trackingStatus.status,
      currentLocation: trackingStatus.currentLocation,
      estimatedDeliveryDate: trackingStatus.estimatedDeliveryDate,
    });

    // Determine if delivery is complete
    const deliveryCompleted = trackingStatus.status === 'delivered';
    let updated = false;

    // Update order status if delivery is complete and order status is not already delivered
    if (deliveryCompleted && previousStatus !== 'delivered') {
      try {
        // Update order status to delivered
        await adminUpdateOrderStatus(orderId, 'delivered');
        updated = true;

        // Invalidate cache to ensure fresh data
        invalidateTrackingCache(trackingNumber);

        console.log(`[Shipment Sync] Order ${orderId} marked as delivered`);

        // Get order details for email
        const order = await getOrderById(orderId);
        if (order) {
          // Get real customer email
          const customerInfo = await getCustomerEmail(order.userId);
          
          if (customerInfo) {
            // 1. Send delivery completion email using sendOrderStatusEmail (proven system)
            const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
            await sendOrderStatusEmail({
              customerEmail: customerInfo.email,
              customerName: customerInfo.name,
              orderNumber: order.orderNumber,
              status: 'delivered',
              trackingNumber: trackingNumber,
              carrier: shipment.carrier || 'Japan Post',
              reviewLink: `${baseUrl}/mypage/order/${orderId}`,
            });

            // 2. Send review request email (separate, more focused email)
            // Delay slightly to avoid sending two emails at the exact same time
            setTimeout(async () => {
              await sendCustomerReviewRequestEmail(
                customerInfo.email,
                customerInfo.name,
                order.orderNumber,
                orderId
              );
            }, 5000);
          } else {
            console.warn(`[Shipment Sync] No customer email found for order ${orderId} (userId: ${order.userId})`);
            // Still use shippingName for owner notification
            await notifyOwner({
              title: `配送完了: ${order.orderNumber}`,
              content: `注文 ${order.orderNumber} が配送完了しました。追跡番号: ${trackingNumber}。顧客メールアドレスが見つからないため、顧客への通知は送信されませんでした。`,
            });
          }
        }
      } catch (error) {
        console.error(`[Shipment Sync] Error updating order status for ${orderId}:`, error);
      }
    }

    return {
      orderId,
      trackingNumber,
      previousStatus,
      currentStatus: trackingStatus.status,
      updated,
      deliveryCompleted,
      message: updated 
        ? 'Order status updated to delivered' 
        : `Status: ${trackingStatus.status}`,
    };
  } catch (error) {
    console.error(`[Shipment Sync] Error syncing shipment for order ${orderId}:`, error);
    
    return {
      orderId,
      trackingNumber: '',
      previousStatus: 'unknown',
      currentStatus: 'unknown',
      updated: false,
      deliveryCompleted: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Sync shipment status for all active orders
 * Useful for batch updates
 */
export async function syncAllShipments(): Promise<ShipmentSyncResult[]> {
  try {
    const db = await getDb();
    
    if (!db) {
      console.error('[Shipment Sync] Database not initialized');
      return [];
    }

    // Get all orders with 'shipped' status
    const activeOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, ['shipped']));

    const results: ShipmentSyncResult[] = [];

    // Sync each order
    for (const order of activeOrders) {
      const result = await syncShipmentStatus(order.id);
      results.push(result);

      // Add delay to avoid overwhelming the Japan Post server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[Shipment Sync] Synced ${results.length} orders, ${results.filter(r => r.updated).length} updated`);
    return results;
  } catch (error) {
    console.error('[Shipment Sync] Error syncing all shipments:', error);
    return [];
  }
}

/**
 * Schedule periodic shipment status sync
 * Runs every 30 minutes (reduced from 1 hour for faster delivery detection)
 * Should be called during server initialization
 */
export function startShipmentStatusSync(intervalMs: number = 30 * 60 * 1000): NodeJS.Timeout {
  console.log(`[Shipment Sync] Starting periodic sync every ${intervalMs / 1000 / 60} minutes`);
  
  return setInterval(async () => {
    try {
      const results = await syncAllShipments();
      const updated = results.filter(r => r.updated).length;
      
      if (updated > 0) {
        console.log(`[Shipment Sync] Updated ${updated} orders to delivered status`);
      }
    } catch (error) {
      console.error('[Shipment Sync] Error in periodic sync:', error);
    }
  }, intervalMs);
}
