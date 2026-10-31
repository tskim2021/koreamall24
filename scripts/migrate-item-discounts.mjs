/**
 * 기존 주문 데이터에 상품별 할인금액(discountAmount) 역산 마이그레이션 스크립트
 * 
 * 로직:
 * 1. couponDiscount > 0 인 주문을 조회
 * 2. 각 주문의 order_items를 가져와 subtotal 비율로 couponDiscount를 분배
 * 3. order_items.discountAmount에 저장
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('[Migration] Connected to database');

  try {
    // 1. couponDiscount > 0 이고 order_items에 discountAmount가 아직 없는 주문 조회
    const [orders] = await connection.execute(
      `SELECT id, couponDiscount FROM orders WHERE couponDiscount > 0`
    );

    console.log(`[Migration] Found ${orders.length} orders with coupon discount`);
    let updatedCount = 0;

    for (const order of orders) {
      const orderId = order.id;
      const couponDiscount = parseFloat(order.couponDiscount || '0');
      if (couponDiscount <= 0) continue;

      // 2. 해당 주문의 order_items 조회
      const [items] = await connection.execute(
        `SELECT id, subtotal FROM order_items WHERE orderId = ?`,
        [orderId]
      );

      if (items.length === 0) continue;

      // 3. subtotal 합계 계산
      const totalSubtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal || '0'), 0);
      if (totalSubtotal <= 0) continue;

      // 4. 비율에 따라 할인금액 분배 (마지막 상품에 나머지 할당)
      let remaining = couponDiscount;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let allocated;
        if (i === items.length - 1) {
          allocated = remaining; // 마지막 상품에 나머지 할당
        } else {
          allocated = Math.floor((couponDiscount * parseFloat(item.subtotal || '0')) / totalSubtotal);
          remaining -= allocated;
        }

        // 5. order_items.discount_amount 업데이트
        await connection.execute(
          `UPDATE order_items SET discountAmount = ? WHERE id = ?`,
          [allocated.toString(), item.id]
        );
      }

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`[Migration] Processed ${updatedCount} orders...`);
      }
    }

    console.log(`[Migration] Done! Updated ${updatedCount} orders with item-level discount amounts`);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
