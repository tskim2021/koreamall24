import { describe, it, expect } from "vitest";
import {
  getPendingOrdersCount,
  getUnansweredInquiriesCount,
  getUnansweredProductQuestionsCount,
} from "./db";

describe("Pending Items Widget Data", () => {
  it("should retrieve pending orders count without errors", async () => {
    const count = await getPendingOrdersCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should retrieve unanswered inquiries count without errors", async () => {
    const count = await getUnansweredInquiriesCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should retrieve unanswered product questions count without errors", async () => {
    const count = await getUnansweredProductQuestionsCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should calculate total pending items correctly", async () => {
    const pendingOrders = await getPendingOrdersCount();
    const unansweredInquiries = await getUnansweredInquiriesCount();
    const unansweredQuestions = await getUnansweredProductQuestionsCount();
    
    const total = pendingOrders + unansweredInquiries + unansweredQuestions;
    
    expect(typeof total).toBe("number");
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("should return consistent counts on multiple calls", async () => {
    const count1 = await getPendingOrdersCount();
    const count2 = await getPendingOrdersCount();
    
    // Counts should be the same if no changes occurred
    expect(count1).toBe(count2);
  });
});
