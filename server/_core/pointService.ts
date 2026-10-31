/**
 * Point Service Module
 * 
 * Handles all point-related operations:
 * - Earning points from purchases
 * - Spending points on orders
 * - Admin manual adjustments
 * - Transaction history tracking
 */

import { getDb } from "../db";
import { pointTransactions, registeredUsers, orders, type PointTransaction } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// Default point earning rate: 1% of order amount
const DEFAULT_POINT_RATE = 0.01;

/**
 * Get user's current point balance
 */
export async function getUserPoints(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [user] = await db
    .select({ points: registeredUsers.points })
    .from(registeredUsers)
    .where(eq(registeredUsers.id, userId))
    .limit(1);

  return user?.points || 0;
}

/**
 * Earn points from order (called after order completion/delivery)
 */
export async function earnPointsFromOrder(
  userId: number,
  orderId: number,
  orderAmount: number,
  pointRate: number = DEFAULT_POINT_RATE
): Promise<{ success: boolean; pointsEarned: number; newBalance: number }> {
  const db = await getDb();
  if (!db) return { success: false, pointsEarned: 0, newBalance: 0 };

  const pointsEarned = Math.floor(orderAmount * pointRate);
  if (pointsEarned <= 0) {
    return { success: false, pointsEarned: 0, newBalance: 0 };
  }

  // Update user points
  const currentBalance = await getUserPoints(userId);
  const newBalance = currentBalance + pointsEarned;

  await db
    .update(registeredUsers)
    .set({ points: newBalance })
    .where(eq(registeredUsers.id, userId));

  // Record transaction
  await db.insert(pointTransactions).values({
    userId,
    orderId,
    type: "earn",
    amount: pointsEarned,
    balance: newBalance,
    description: `購入で獲得 (注文 #${orderId})`,
  });

  return { success: true, pointsEarned, newBalance };
}

/**
 * Spend points on order (called during checkout)
 */
export async function spendPointsOnOrder(
  userId: number,
  orderId: number,
  pointsToSpend: number
): Promise<{ success: boolean; message?: string; newBalance?: number }> {
  const db = await getDb();
  if (!db) return { success: false, message: "DB unavailable" };

  if (pointsToSpend <= 0) {
    return { success: false, message: "使用ポイントは1以上である必要があります" };
  }

  const currentBalance = await getUserPoints(userId);
  if (currentBalance < pointsToSpend) {
    return { success: false, message: "ポイント残高が不足しています" };
  }

  const newBalance = currentBalance - pointsToSpend;

  // Update user points
  await db
    .update(registeredUsers)
    .set({ points: newBalance })
    .where(eq(registeredUsers.id, userId));

  // Record transaction
  await db.insert(pointTransactions).values({
    userId,
    orderId,
    type: "spend",
    amount: -pointsToSpend,
    balance: newBalance,
    description: `ポイント使用 (注文 #${orderId})`,
  });

  return { success: true, newBalance };
}

/**
 * Admin manual point adjustment
 */
export async function adminAdjustPoints(
  userId: number,
  amount: number,
  description: string,
  isAdd: boolean = true
): Promise<{ success: boolean; message?: string; newBalance?: number }> {
  const db = await getDb();
  if (!db) return { success: false, message: "DB unavailable" };

  const currentBalance = await getUserPoints(userId);
  const newBalance = currentBalance + (isAdd ? amount : -amount);

  if (newBalance < 0) {
    return { success: false, message: "ポイント残高がマイナスになります" };
  }

  // Update user points
  await db
    .update(registeredUsers)
    .set({ points: newBalance })
    .where(eq(registeredUsers.id, userId));

  // Record transaction
  await db.insert(pointTransactions).values({
    userId,
    orderId: null,
    type: isAdd ? "admin_add" : "admin_deduct",
    amount: isAdd ? amount : -amount,
    balance: newBalance,
    description: description || (isAdd ? "管理者付与" : "管理者減算"),
  });

  return { success: true, newBalance };
}

/**
 * Get user's point transaction history
 */
export async function getPointTransactions(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<PointTransaction[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .$dynamic();

  if (options?.startDate) {
    query = query.where(gte(pointTransactions.createdAt, options.startDate));
  }
  if (options?.endDate) {
    query = query.where(lte(pointTransactions.createdAt, options.endDate));
  }

  query = query.orderBy(desc(pointTransactions.createdAt));

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }

  return await query;
}

/**
 * Calculate maximum points user can spend on order
 * (typically limited to 50% of order amount or user's balance, whichever is lower)
 */
export function calculateMaxSpendablePoints(
  userBalance: number,
  orderAmount: number,
  maxPercentage: number = 0.5
): number {
  const maxByAmount = Math.floor(orderAmount * maxPercentage);
  return Math.min(userBalance, maxByAmount);
}
