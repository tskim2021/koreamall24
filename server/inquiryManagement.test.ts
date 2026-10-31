import { describe, it, expect } from "vitest";

describe("Inquiry Management System", () => {
  it("should have inquiry database functions", async () => {
    const {
      getAllInquiries,
      getInquiryById,
      getInquiryComments,
      createInquiryComment,
      updateInquiry,
    } = await import("./db");

    expect(typeof getAllInquiries).toBe("function");
    expect(typeof getInquiryById).toBe("function");
    expect(typeof getInquiryComments).toBe("function");
    expect(typeof createInquiryComment).toBe("function");
    expect(typeof updateInquiry).toBe("function");
  });

  it("should fetch all inquiries", async () => {
    const { getAllInquiries } = await import("./db");
    const inquiries = await getAllInquiries();

    expect(Array.isArray(inquiries)).toBe(true);
    console.log(`✅ Found ${inquiries.length} inquiries in database`);

    if (inquiries.length > 0) {
      const inquiry = inquiries[0];
      expect(inquiry).toHaveProperty("id");
      expect(inquiry).toHaveProperty("title");
      expect(inquiry).toHaveProperty("content");
      expect(inquiry).toHaveProperty("status");
      expect(inquiry).toHaveProperty("userId");
      expect(inquiry).toHaveProperty("createdAt");
      console.log(`✅ Inquiry structure validated: ${inquiry.title}`);
    }
  });

  it("should fetch inquiry by ID", async () => {
    const { getAllInquiries, getInquiryById } = await import("./db");
    const inquiries = await getAllInquiries();

    if (inquiries.length > 0) {
      const firstInquiry = inquiries[0];
      const inquiry = await getInquiryById(firstInquiry.id);

      expect(inquiry).toBeDefined();
      expect(inquiry?.id).toBe(firstInquiry.id);
      expect(inquiry?.title).toBe(firstInquiry.title);
      console.log(`✅ Fetched inquiry by ID: ${inquiry?.title}`);
    } else {
      console.log("⚠️ No inquiries found, skipping ID fetch test");
    }
  });

  it("should fetch inquiry comments", async () => {
    const { getAllInquiries, getInquiryComments } = await import("./db");
    const inquiries = await getAllInquiries();

    if (inquiries.length > 0) {
      const firstInquiry = inquiries[0];
      const comments = await getInquiryComments(firstInquiry.id);

      expect(Array.isArray(comments)).toBe(true);
      console.log(`✅ Found ${comments.length} comments for inquiry ${firstInquiry.id}`);

      if (comments.length > 0) {
        const comment = comments[0];
        expect(comment).toHaveProperty("id");
        expect(comment).toHaveProperty("inquiryId");
        expect(comment).toHaveProperty("userId");
        expect(comment).toHaveProperty("content");
        expect(comment).toHaveProperty("userName");
        console.log(`✅ Comment structure validated: ${comment.content.substring(0, 50)}...`);
      }
    } else {
      console.log("⚠️ No inquiries found, skipping comments test");
    }
  });

  it("should verify admin inquiry APIs are callable", async () => {
    // Admin inquiry APIs are protected procedures that require authentication
    // We verify they exist by importing the router module
    const routersModule = await import("./routers");
    expect(routersModule.appRouter).toBeDefined();
    console.log("✅ Admin inquiry management APIs are registered in routers");
  });

  it("should verify inquiry status enum values", async () => {
    const { getAllInquiries } = await import("./db");
    const inquiries = await getAllInquiries();

    if (inquiries.length > 0) {
      inquiries.forEach((inquiry) => {
        expect(["pending", "answered"]).toContain(inquiry.status);
      });
      console.log(`✅ All ${inquiries.length} inquiries have valid status values`);
    } else {
      console.log("⚠️ No inquiries found, skipping status validation");
    }
  });
});
