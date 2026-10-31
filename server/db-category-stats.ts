import { getDb } from './db';
import { sql, and, gte, eq } from 'drizzle-orm';
import { orders, orderItems, products, categories } from '../drizzle/schema';

export interface CategoryStats {
  categoryId: number;
  categoryName: string;
  categoryNameJa: string;
  totalSales: number;
  totalRevenue: number;
  orderCount: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    productNameJa: string;
    sales: number;
    revenue: number;
  }>;
}

/**
 * Get category-wise sales statistics
 * @param period - Time period filter: 'today' | '7days' | '30days' | 'all'
 *
 * NOTE: order_items table uses `unitPrice` (not `price`).
 * Revenue = SUM(unitPrice * quantity).
 * Use backtick-escaped sql`` template literals for ORDER BY to avoid
 * Drizzle ORM interpolation issues with complex expressions.
 */
export async function getCategoryStats(period: 'today' | '7days' | '30days' | 'all' = 'all'): Promise<CategoryStats[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get category stats: database not available");
    return [];
  }

  try {
    // Calculate date filter
    let dateFrom: Date | null = null;
    if (period !== 'all') {
      const now = new Date();
      dateFrom = new Date();

      if (period === 'today') {
        dateFrom.setHours(0, 0, 0, 0);
      } else if (period === '7days') {
        dateFrom.setDate(now.getDate() - 7);
      } else if (period === '30days') {
        dateFrom.setDate(now.getDate() - 30);
      }
    }

    // Get category-wise statistics
    // Revenue uses unitPrice (not price) - order_items schema uses unitPrice
    const categoryStatsQuery = await db
      .select({
        categoryId: products.categoryId,
        categoryName: categories.name,
        categoryNameJa: categories.nameJa,
        totalSales:   sql<number>`CAST(COALESCE(SUM(\`order_items\`.\`quantity\`), 0) AS SIGNED)`,
        totalRevenue: sql<number>`CAST(COALESCE(SUM(\`order_items\`.\`unitPrice\` * \`order_items\`.\`quantity\`), 0) AS DECIMAL(10,2))`,
        orderCount:   sql<number>`CAST(COUNT(DISTINCT \`orders\`.\`id\`) AS SIGNED)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(dateFrom ? and(gte(orders.createdAt, dateFrom)) : undefined)
      .groupBy(products.categoryId, categories.name, categories.nameJa)
      .orderBy(sql`CAST(COALESCE(SUM(\`order_items\`.\`unitPrice\` * \`order_items\`.\`quantity\`), 0) AS DECIMAL(10,2)) DESC`);

    // For each category, get top 3 products
    const result: CategoryStats[] = [];
    for (const cat of categoryStatsQuery) {
      const topProductsQuery = await db
        .select({
          productId:     products.id,
          productName:   products.name,
          productNameJa: products.nameJa,
          sales:   sql<number>`CAST(COALESCE(SUM(\`order_items\`.\`quantity\`), 0) AS SIGNED)`,
          revenue: sql<number>`CAST(COALESCE(SUM(\`order_items\`.\`unitPrice\` * \`order_items\`.\`quantity\`), 0) AS DECIMAL(10,2))`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(products.categoryId, cat.categoryId),
            ...(dateFrom ? [gte(orders.createdAt, dateFrom)] : [])
          )
        )
        .groupBy(products.id, products.name, products.nameJa)
        .orderBy(sql`CAST(COALESCE(SUM(\`order_items\`.\`quantity\`), 0) AS SIGNED) DESC`)
        .limit(3);

      result.push({
        categoryId:    Number(cat.categoryId),
        categoryName:  cat.categoryName,
        categoryNameJa: cat.categoryNameJa,
        totalSales:    Number(cat.totalSales),
        totalRevenue:  Number(cat.totalRevenue),
        orderCount:    Number(cat.orderCount),
        topProducts: topProductsQuery.map(p => ({
          productId:     Number(p.productId),
          productName:   p.productName,
          productNameJa: p.productNameJa,
          sales:   Number(p.sales),
          revenue: Number(p.revenue),
        })),
      });
    }

    return result;
  } catch (error) {
    console.error("[Database] Failed to get category stats:", error);
    return [];
  }
}
