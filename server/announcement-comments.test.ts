import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createAnnouncement,
  getAnnouncementComments,
  deleteAnnouncementComment,
} from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `sample-user-${userId}`,
    email: `sample${userId}@example.com`,
    name: `Sample User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}



describe("announcement comments", () => {
  let announcementId: number;

  beforeAll(async () => {
    // Create a test announcement
    const announcement = await createAnnouncement({
      title: "Test Announcement",
      titleJa: "テスト公知事項",
      content: "Test content",
      contentJa: "テストコンテンツ",
      isActive: true,
      sortOrder: 0,
    });
    announcementId = announcement.id;
  });

  afterAll(async () => {
    // Clean up is handled by the database cleanup
  });

  it("should get comments for an announcement", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    // Get comments before adding any
    const commentsBefore = await caller.announcements.getComments({
      announcementId,
    });

    expect(Array.isArray(commentsBefore)).toBe(true);

    // Add a comment
    await caller.announcements.addComment({
      announcementId,
      content: "Test comment for get",
    });

    // Get comments after adding
    const commentsAfter = await caller.announcements.getComments({
      announcementId,
    });

    expect(Array.isArray(commentsAfter)).toBe(true);
    expect(commentsAfter.length).toBeGreaterThan(commentsBefore.length);
  });

  it("should add a comment to an announcement", async () => {
    const { ctx } = createAuthContext(5);
    const caller = appRouter.createCaller(ctx);

    const comment = await caller.announcements.addComment({
      announcementId,
      content: "This is a test comment",
    });

    expect(comment).toBeDefined();
    expect(comment.content).toBe("This is a test comment");
    expect(comment.userId).toBe(5);
    expect(comment.announcementId).toBe(announcementId);
  });

  it("should not allow adding a comment without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.announcements.addComment({
        announcementId,
        content: "This should fail",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error?.code || error?.message).toContain("UNAUTHORIZED");
    }
  });

  it("should delete a comment", async () => {
    const { ctx: ctx1 } = createAuthContext(3);
    const caller1 = appRouter.createCaller(ctx1);

    // Add a comment
    const comment = await caller1.announcements.addComment({
      announcementId,
      content: "Comment to delete",
    });

    // Delete the comment
    const { ctx: ctx2 } = createAuthContext(3);
    const caller2 = appRouter.createCaller(ctx2);
    const result = await caller2.announcements.deleteComment({
      commentId: comment.id,
    });

    expect(result).toEqual({ success: true });

    // Verify the comment is deleted
    const comments = await caller2.announcements.getComments({
      announcementId,
    });
    const deletedComment = comments.find((c: any) => c.id === comment.id);
    expect(deletedComment).toBeUndefined();
  });

  it("should not allow deleting a comment without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.announcements.deleteComment({
        commentId: 999,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error?.code || error?.message).toContain("UNAUTHORIZED");
    }
  });

  it("should update a comment", async () => {
    const { ctx: ctx1 } = createAuthContext(4);
    const caller1 = appRouter.createCaller(ctx1);

    // Add a comment
    const comment = await caller1.announcements.addComment({
      announcementId,
      content: "Original comment",
    });

    // Update the comment
    const result = await caller1.announcements.updateComment({
      commentId: comment.id,
      content: "Updated comment",
    });

    expect(result).toEqual({ success: true });

    // Verify the comment is updated
    const comments = await caller1.announcements.getComments({
      announcementId,
    });
    const updatedComment = comments.find((c: any) => c.id === comment.id);
    expect(updatedComment?.content).toBe("Updated comment");
  });

  it("should not allow updating a comment without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.announcements.updateComment({
        commentId: 999,
        content: "This should fail",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error?.code || error?.message).toContain("UNAUTHORIZED");
    }
  });
});
