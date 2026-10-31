/**
 * Wishlist Sale Alert Service
 * 
 * Periodically checks if products in users' wishlists have gone on sale,
 * and sends email notifications to those users.
 * 
 * Runs every 6 hours as part of the server scheduler.
 */

import { getDb, buildFullName } from "../db";
import { wishlists, products, users, registeredUsers } from "../../drizzle/schema";
import { eq, isNotNull, or, and, gt, sql } from "drizzle-orm";
import { sendEmail } from "./email";
import { notifyOwner } from "./notification";

// Track which alerts have been sent to avoid duplicates
// Key: `${userId}-${productId}`, Value: timestamp of last alert
const sentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown per user-product pair

/**
 * Find wishlist products that are currently on sale (have originalPrice > price)
 * or have isTimeSale/isMonthlySale flags set
 */
async function getWishlistSaleProducts() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const results = await db
    .select({
      userId: wishlists.userId,
      productId: wishlists.productId,
      productNameJa: products.nameJa,
      productName: products.name,
      productPrice: products.price,
      productOriginalPrice: products.originalPrice,
      productImageUrl: products.imageUrl,
      isTimeSale: products.isTimeSale,
      isMonthlySale: products.isMonthlySale,
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(
      or(
        // Products with discount (originalPrice > price)
        and(
          isNotNull(products.originalPrice),
          gt(products.originalPrice, products.price)
        ),
        // Time sale products
        eq(products.isTimeSale, true),
        // Monthly sale products
        eq(products.isMonthlySale, true)
      )
    );

  return results;
}

/**
 * Get user email by userId - checks registeredUsers first, then users table
 */
async function getUserEmail(userId: number): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  if (!db) return null;
  // Try registeredUsers first (has direct email)
  const registered = await db
    .select({ email: registeredUsers.email, lastNameKanji: registeredUsers.lastNameKanji, firstNameKanji: registeredUsers.firstNameKanji, nameKanji: registeredUsers.nameKanji })
    .from(registeredUsers)
    .where(eq(registeredUsers.id, userId))
    .limit(1);

  if (registered.length > 0 && registered[0].email) {
    return { email: registered[0].email, name: buildFullName(registered[0]) || "お客様" };
  }

  // Fallback to users table
  const user = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length > 0 && user[0].email) {
    return { email: user[0].email, name: user[0].name || "お客様" };
  }

  return null;
}

/**
 * Generate sale alert email HTML
 */
function generateSaleAlertEmail(
  customerName: string,
  saleProducts: Array<{
    userId?: number;
    productName?: string;
    productNameJa: string;
    productPrice: number | string;
    productOriginalPrice: number | string | null;
    productImageUrl: string | null;
    productId: number;
    isTimeSale: boolean | null;
    isMonthlySale: boolean | null;
  }>,
  baseUrl: string
): string {
  const productRows = saleProducts.map((p) => {
    const price = Number(p.productPrice);
    const originalPrice = p.productOriginalPrice ? Number(p.productOriginalPrice) : null;
    const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
    const badges: string[] = [];
    if (p.isTimeSale) badges.push('<span style="background:#e91e63;color:white;padding:2px 8px;border-radius:12px;font-size:11px;">タイムセール</span>');
    if (p.isMonthlySale) badges.push('<span style="background:#4caf50;color:white;padding:2px 8px;border-radius:12px;font-size:11px;">月間セール</span>');
    if (discount > 0) badges.push(`<span style="background:#ff6b35;color:white;padding:2px 8px;border-radius:12px;font-size:11px;">${discount}%OFF</span>`);

    return `
      <tr>
        <td style="padding:15px;border-bottom:1px solid #eee;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${p.productImageUrl ? `<img src="${p.productImageUrl}" alt="${p.productNameJa}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" />` : ''}
            <div>
              <a href="${baseUrl}/product/${p.productId}" style="color:#333;text-decoration:none;font-weight:bold;font-size:14px;">${p.productNameJa}</a>
              <div style="margin-top:4px;">${badges.join(' ')}</div>
              <div style="margin-top:6px;">
                ${originalPrice ? `<span style="text-decoration:line-through;color:#999;font-size:13px;">${originalPrice.toLocaleString()}円</span> → ` : ''}
                <span style="color:#e91e63;font-weight:bold;font-size:16px;">${price.toLocaleString()}円</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#e91e63 0%,#ff6b35 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:24px;">🎉 お気に入り商品がセール中！</h1>
          <p style="margin:10px 0 0 0;font-size:14px;">ココくすり ウィッシュリスト セールアラート</p>
        </div>
        <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;">
          <p>${customerName}様、</p>
          <p>お気に入りに登録された商品がセール中です！お見逃しなく。</p>
          
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            ${productRows}
          </table>
          
          <div style="text-align:center;margin:25px 0;">
            <a href="${baseUrl}/mypage/wishlist" style="display:inline-block;background:#e91e63;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;">ウィッシュリストを見る</a>
          </div>
          
          <p style="font-size:12px;color:#888;margin-top:20px;">
            ※セール価格は予告なく変更される場合があります。<br>
            ※在庫がなくなり次第終了となります。
          </p>
        </div>
        <div style="text-align:center;color:#888;font-size:12px;margin-top:20px;">
          <p>このメールは自動送信されています。返信はできません。</p>
          <p>© 2026 ココくすり All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Main function: Check wishlist products on sale and send alerts
 */
export async function checkWishlistSaleAlerts(): Promise<{ sent: number; skipped: number }> {
  console.log("[WishlistSaleAlert] Starting wishlist sale alert check...");
  
  let sent = 0;
  let skipped = 0;

  try {
    const saleProducts = await getWishlistSaleProducts();
    
    if (saleProducts.length === 0) {
      console.log("[WishlistSaleAlert] No wishlist products on sale.");
      return { sent: 0, skipped: 0 };
    }

    console.log(`[WishlistSaleAlert] Found ${saleProducts.length} wishlist-sale matches.`);

    // Group by userId
    const userProductMap = new Map<number, typeof saleProducts>();
    for (const sp of saleProducts) {
      const alertKey = `${sp.userId}-${sp.productId}`;
      const lastSent = sentAlerts.get(alertKey);
      
      // Skip if alert was sent recently
      if (lastSent && Date.now() - lastSent < ALERT_COOLDOWN_MS) {
        skipped++;
        continue;
      }

      if (!userProductMap.has(sp.userId)) {
        userProductMap.set(sp.userId, []);
      }
      userProductMap.get(sp.userId)!.push(sp);
    }

    const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';

    // Send emails per user
    for (const [userId, products] of Array.from(userProductMap.entries())) {
      const userInfo = await getUserEmail(userId);
      if (!userInfo) {
        console.log(`[WishlistSaleAlert] No email found for user ${userId}, skipping.`);
        skipped += products.length;
        continue;
      }

      const html = generateSaleAlertEmail(userInfo.name, products, baseUrl);
      
      const emailSent = await sendEmail({
        to: userInfo.email,
        subject: `【ココくすり】お気に入り商品が${products.length}件セール中です！`,
        html,
      });

      if (emailSent) {
        sent += products.length;
        // Mark alerts as sent
        for (const p of products) {
          sentAlerts.set(`${userId}-${p.productId}`, Date.now());
        }
        console.log(`[WishlistSaleAlert] Sent alert to ${userInfo.email} for ${products.length} products.`);
      } else {
        skipped += products.length;
        console.warn(`[WishlistSaleAlert] Failed to send alert to ${userInfo.email}.`);
      }

      // Rate limiting: 1 second between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Notify owner about alert summary
    if (sent > 0) {
      await notifyOwner({
        title: "ウィッシュリスト セールアラート送信完了",
        content: `${userProductMap.size}名のお客様に${sent}件のセールアラートを送信しました。スキップ: ${skipped}件`,
      });
    }

  } catch (error) {
    console.error("[WishlistSaleAlert] Error:", error);
  }

  console.log(`[WishlistSaleAlert] Done. Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}

/**
 * Start periodic wishlist sale alert check (every 6 hours)
 */
export function startWishlistSaleAlerts() {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
  
  console.log("[WishlistSaleAlert] Starting periodic check every 6 hours.");
  
  // Run first check after 5 minutes (let server stabilize)
  setTimeout(() => {
    checkWishlistSaleAlerts();
    
    // Then run every 6 hours
    setInterval(() => {
      checkWishlistSaleAlerts();
    }, INTERVAL_MS);
  }, 5 * 60 * 1000);
}
