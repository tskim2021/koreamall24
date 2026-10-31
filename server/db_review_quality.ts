/**
 * Review Quality Management Functions
 * Handles review reports, approval/rejection, and content filtering
 */

import { getDb } from './db';
import { reviews, reviewReports, users } from '../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Create a review report
 */
export async function createReviewReport(params: {
  reviewId: number;
  reporterUserId: number;
  reason: 'spam' | 'inappropriate' | 'offensive' | 'fake' | 'other';
  comment?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Check if user already reported this review
  const existingReport = await db
    .select()
    .from(reviewReports)
    .where(
      and(
        eq(reviewReports.reviewId, params.reviewId),
        eq(reviewReports.reporterUserId, params.reporterUserId)
      )
    )
    .limit(1);

  if (existingReport.length > 0) {
    throw new Error('You have already reported this review');
  }

  // Create report
  const [report] = await db.insert(reviewReports).values({
    reviewId: params.reviewId,
    reporterUserId: params.reporterUserId,
    reason: params.reason,
    comment: params.comment || null,
    status: 'pending',
  });

  // Increment report count on review
  await db
    .update(reviews)
    .set({
      reportCount: sql`${reviews.reportCount} + 1`,
    })
    .where(eq(reviews.id, params.reviewId));

  return report;
}

/**
 * Get all review reports (admin only)
 */
export async function getAllReviewReports(params?: {
  status?: 'pending' | 'reviewed' | 'dismissed';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  let query = db
    .select({
      report: reviewReports,
      review: reviews,
      reporter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(reviewReports)
    .innerJoin(reviews, eq(reviewReports.reviewId, reviews.id))
    .innerJoin(users, eq(reviewReports.reporterUserId, users.id))
    .orderBy(desc(reviewReports.createdAt));

  if (params?.status) {
    query = query.where(eq(reviewReports.status, params.status)) as any;
  }

  if (params?.limit) {
    query = query.limit(params.limit) as any;
  }

  if (params?.offset) {
    query = query.offset(params.offset) as any;
  }

  return await query;
}

/**
 * Update review report status (admin only)
 */
export async function updateReviewReportStatus(params: {
  reportId: number;
  status: 'reviewed' | 'dismissed';
  reviewedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(reviewReports)
    .set({
      status: params.status,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(reviewReports.id, params.reportId));

  return { success: true };
}

/**
 * Approve a review (admin only)
 */
export async function approveReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(reviews)
    .set({
      status: 'approved',
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId));

  return { success: true };
}

/**
 * Reject a review (admin only)
 */
export async function rejectReview(params: {
  reviewId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(reviews)
    .set({
      status: 'rejected',
      rejectionReason: params.reason,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, params.reviewId));

  return { success: true };
}

/**
 * Get reviews pending approval (admin only)
 */
export async function getPendingReviews(params?: {
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  let query = db
    .select({
      review: reviews,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.status, 'pending'))
    .orderBy(desc(reviews.createdAt));

  if (params?.limit) {
    query = query.limit(params.limit) as any;
  }

  if (params?.offset) {
    query = query.offset(params.offset) as any;
  }

  return await query;
}

/**
 * Check if review content contains inappropriate words
 * Simple keyword-based filtering (can be enhanced with AI)
 */
export function containsInappropriateContent(content: string): boolean {
  const inappropriateKeywords = [
    // Japanese inappropriate words
    'バカ', 'アホ', 'クソ', '死ね', 'ゴミ', '詐欺',
    // Korean inappropriate words
    '바보', '멍청이', '쓰레기', '사기',
    // English inappropriate words
    'fuck', 'shit', 'damn', 'scam', 'fake', 'fraud',
  ];

  const lowerContent = content.toLowerCase();
  return inappropriateKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * Check if review is spam (too short, repetitive, etc.)
 */
export function isSpamReview(content: string): boolean {
  // Too short
  if (content.length < 10) {
    return true;
  }

  // Repetitive characters (e.g., "aaaaaaa")
  const repetitivePattern = /(.)\1{5,}/;
  if (repetitivePattern.test(content)) {
    return true;
  }

  // All caps (spam-like)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 20) {
    return true;
  }

  return false;
}

/**
 * Auto-filter review content before submission
 * Returns { approved: boolean, reason?: string }
 */
export function autoFilterReview(content: string, title?: string): {
  approved: boolean;
  reason?: string;
} {
  // Check spam
  if (isSpamReview(content)) {
    return {
      approved: false,
      reason: 'スパムと判定されました。',
    };
  }

  // Check inappropriate content
  if (containsInappropriateContent(content)) {
    return {
      approved: false,
      reason: '不適切な内容が含まれています。',
    };
  }

  if (title && containsInappropriateContent(title)) {
    return {
      approved: false,
      reason: 'タイトルに不適切な内容が含まれています。',
    };
  }

  return { approved: true };
}
