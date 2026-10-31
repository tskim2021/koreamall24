import { eq, and, gte, sql, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { orders, orderItems } from "../drizzle/schema";

export type CancellationPeriod = '7days' | '30days' | '90days' | 'all';

export interface CancellationStats {
  // 요약 카드
  totalCancelledOrders: number;
  totalCancelledItems: number;
  totalRefundAmount: number;
  cancellationRate: number; // 전체 주문 대비 취소율 (%)

  // 월별 취소 추이 (최근 6개월)
  monthlyTrend: Array<{
    month: string;   // e.g. "2026-01"
    cancelledOrders: number;
    refundAmount: number;
  }>;

  // 취소 사유별 통계 (상위 10개)
  reasonStats: Array<{
    reason: string;
    count: number;
    refundAmount: number;
  }>;

  // 결제 수단별 취소 통계
  paymentMethodStats: Array<{
    paymentMethod: string;
    count: number;
    refundAmount: number;
  }>;
}

function getDateFilter(period: CancellationPeriod): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

export async function getCancellationStats(period: CancellationPeriod): Promise<CancellationStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalCancelledOrders: 0,
      totalCancelledItems: 0,
      totalRefundAmount: 0,
      cancellationRate: 0,
      monthlyTrend: [],
      reasonStats: [],
      paymentMethodStats: [],
    };
  }

  try {
    const dateFrom = getDateFilter(period);

    // 1. 취소된 주문 수 (status = 'cancelled' OR 'partially_cancelled')
    const cancelledOrdersQuery = db.select({
      count: sql<number>`COUNT(DISTINCT ${orders.id})`,
    }).from(orders).where(
      dateFrom
        ? and(
            sql`${orders.status} IN ('cancelled', 'partially_cancelled')`,
            gte(orders.createdAt, dateFrom)
          )
        : sql`${orders.status} IN ('cancelled', 'partially_cancelled')`
    );

    // 2. 전체 주문 수 (취소율 계산용)
    const totalOrdersQuery = db.select({
      count: sql<number>`COUNT(*)`,
    }).from(orders).where(
      dateFrom ? gte(orders.createdAt, dateFrom) : undefined
    );

    // 3. 취소된 아이템 수 + 환불 금액 합계
    const cancelledItemsQuery = db.select({
      count: sql<number>`COUNT(*)`,
      refundAmount: sql<number>`SUM(${orderItems.subtotal} - COALESCE(${orderItems.discountAmount}, 0))`,
    }).from(orderItems).where(
      dateFrom
        ? and(isNotNull(orderItems.cancelledAt), gte(orderItems.cancelledAt, dateFrom))
        : isNotNull(orderItems.cancelledAt)
    );

    // 4. 월별 취소 추이 (최근 6개월 고정)
    // TiDB only_full_group_by 호환: DATE_FORMAT 사용하여 단일 컬럼으로 GROUP BY
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrendQuery = db.select({
      yearMonth: sql<string>`DATE_FORMAT(\`order_items\`.\`cancelledAt\`, '%Y-%m')`,
      cancelledOrders: sql<number>`COUNT(DISTINCT \`order_items\`.\`orderId\`)`,
      refundAmount: sql<number>`SUM(\`order_items\`.\`subtotal\` - COALESCE(\`order_items\`.\`discountAmount\`, 0))`,
    }).from(orderItems)
      .where(and(isNotNull(orderItems.cancelledAt), gte(orderItems.cancelledAt, sixMonthsAgo)))
      .groupBy(sql`DATE_FORMAT(\`order_items\`.\`cancelledAt\`, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(\`order_items\`.\`cancelledAt\`, '%Y-%m')`);

    // 5. 취소 사유별 통계
    const reasonStatsQuery = db.select({
      reason: orderItems.cancelReason,
      count: sql<number>`COUNT(*)`,
      refundAmount: sql<number>`SUM(${orderItems.subtotal} - COALESCE(${orderItems.discountAmount}, 0))`,
    }).from(orderItems).where(
      dateFrom
        ? and(isNotNull(orderItems.cancelledAt), gte(orderItems.cancelledAt, dateFrom))
        : isNotNull(orderItems.cancelledAt)
    )
      .groupBy(orderItems.cancelReason)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // 6. 결제 수단별 취소 통계
    const paymentMethodStatsQuery = db.select({
      paymentMethod: orders.paymentMethod,
      count: sql<number>`COUNT(DISTINCT ${orders.id})`,
      refundAmount: sql<number>`SUM(${orderItems.subtotal} - COALESCE(${orderItems.discountAmount}, 0))`,
    }).from(orders)
      .innerJoin(orderItems, and(
        eq(orderItems.orderId, orders.id),
        isNotNull(orderItems.cancelledAt)
      ))
      .where(
        dateFrom
          ? and(
              sql`${orders.status} IN ('cancelled', 'partially_cancelled')`,
              gte(orders.createdAt, dateFrom)
            )
          : sql`${orders.status} IN ('cancelled', 'partially_cancelled')`
      )
      .groupBy(orders.paymentMethod)
      .orderBy(sql`COUNT(DISTINCT ${orders.id}) DESC`);

    const [
      cancelledOrdersResult,
      totalOrdersResult,
      cancelledItemsResult,
      monthlyTrendResult,
      reasonStatsResult,
      paymentMethodStatsResult,
    ] = await Promise.all([
      cancelledOrdersQuery,
      totalOrdersQuery,
      cancelledItemsQuery,
      monthlyTrendQuery,
      reasonStatsQuery,
      paymentMethodStatsQuery,
    ]);

    const totalCancelledOrders = Number(cancelledOrdersResult[0]?.count || 0);
    const totalOrders = Number(totalOrdersResult[0]?.count || 0);
    const totalCancelledItems = Number(cancelledItemsResult[0]?.count || 0);
    const totalRefundAmount = Number(cancelledItemsResult[0]?.refundAmount || 0);
    const cancellationRate = totalOrders > 0 ? Math.round((totalCancelledOrders / totalOrders) * 100 * 10) / 10 : 0;

    return {
      totalCancelledOrders,
      totalCancelledItems,
      totalRefundAmount,
      cancellationRate,
      monthlyTrend: monthlyTrendResult.map(r => ({
        month: r.yearMonth,
        cancelledOrders: Number(r.cancelledOrders || 0),
        refundAmount: Number(r.refundAmount || 0),
      })),
      reasonStats: reasonStatsResult.map(r => ({
        reason: r.reason || '사유 없음',
        count: Number(r.count || 0),
        refundAmount: Number(r.refundAmount || 0),
      })),
      paymentMethodStats: paymentMethodStatsResult.map(r => ({
        paymentMethod: r.paymentMethod || 'unknown',
        count: Number(r.count || 0),
        refundAmount: Number(r.refundAmount || 0),
      })),
    };
  } catch (error) {
    console.error('[DB] getCancellationStats error:', error);
    return {
      totalCancelledOrders: 0,
      totalCancelledItems: 0,
      totalRefundAmount: 0,
      cancellationRate: 0,
      monthlyTrend: [],
      reasonStats: [],
      paymentMethodStats: [],
    };
  }
}
