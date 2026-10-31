import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Point System", () => {
  describe("Point Usage", () => {
    it("should record point transaction history", async () => {
      const caller = appRouter.createCaller({ user: { id: 1, role: "user" } as any, req: {} as any, res: {} as any });
      const history = await caller.point.getHistory({ limit: 10, offset: 0 });
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Best Review Selection", () => {
    it("should not allow non-admin to set best review", async () => {
      const userCaller = appRouter.createCaller({ user: { id: 1, role: "user" } as any, req: {} as any, res: {} as any });
      
      // Attempt to set as best review (should fail)
      await expect(
        userCaller.review.setBest({ reviewId: 1, isBest: true })
      ).rejects.toThrow();
    });
  });
});
