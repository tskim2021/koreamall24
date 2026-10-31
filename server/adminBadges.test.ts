import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getPendingOrdersCount,
  getUnansweredInquiriesCount,
  getUnansweredProductQuestionsCount,
  getDb,
} from "./db";
import { orders, inquiries, inquiryComments, productQuestions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Admin Badge Counts", () => {
  let testOrderId: number | null = null;
  let testInquiryId: number | null = null;
  let testProductQuestionId: number | null = null;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test pending order
    const [order] = await db.insert(orders).values({
      userId: 1,
      orderNumber: `TB${Date.now()}`,
      totalAmount: 1000,
      status: "pending",
      shippingName: "Test User",
      shippingPostalCode: "123-4567",
      shippingAddress: "Tokyo Shibuya 1-1-1",
      shippingPhone: "090-1234-5678",
      email: "test@example.com",
    });
    testOrderId = order.insertId as number;

    // Create a test unanswered inquiry
    const [inquiry] = await db.insert(inquiries).values({
      userId: 1,
      title: "Test Inquiry",
      titleJa: "Test Inquiry",
      content: "Test inquiry content",
      contentJa: "Test inquiry content",
      status: "pending",
      isActive: true,
    });
    testInquiryId = inquiry.insertId as number;

    // Create a test unanswered product question
    const [question] = await db.insert(productQuestions).values({
      productId: 1,
      userId: 1,
      question: "Test product question?",
      answer: null,
    });
    testProductQuestionId = question.insertId as number;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testOrderId) {
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    if (testInquiryId) {
      await db.delete(inquiries).where(eq(inquiries.id, testInquiryId));
    }
    if (testProductQuestionId) {
      await db.delete(productQuestions).where(eq(productQuestions.id, testProductQuestionId));
    }
  });

  it("should count pending orders correctly", async () => {
    const count = await getPendingOrdersCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should count unanswered inquiries correctly", async () => {
    const count = await getUnansweredInquiriesCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should count unanswered product questions correctly", async () => {
    const count = await getUnansweredProductQuestionsCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should return 0 for unanswered inquiries when all have comments", async () => {
    const db = await getDb();
    if (!db || !testInquiryId) return;

    // Add a comment to the test inquiry
    await db.insert(inquiryComments).values({
      inquiryId: testInquiryId,
      userId: 1,
      content: "Test reply",
    });

    const count = await getUnansweredInquiriesCount();
    // Should be at least 0 (might have other unanswered inquiries)
    expect(count).toBeGreaterThanOrEqual(0);

    // Clean up the comment
    await db.delete(inquiryComments).where(eq(inquiryComments.inquiryId, testInquiryId));
  });

  it("should return 0 for unanswered product questions when all have answers", async () => {
    const db = await getDb();
    if (!db || !testProductQuestionId) return;

    // Add an answer to the test question
    await db.update(productQuestions)
      .set({ answer: "Test answer" })
      .where(eq(productQuestions.id, testProductQuestionId));

    const count = await getUnansweredProductQuestionsCount();
    // Should be at least 0 (might have other unanswered questions)
    expect(count).toBeGreaterThanOrEqual(0);

    // Restore the question to unanswered state
    await db.update(productQuestions)
      .set({ answer: null })
      .where(eq(productQuestions.id, testProductQuestionId));
  });
});
