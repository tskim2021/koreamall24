import { describe, it, expect } from "vitest";

/**
 * useUnsavedChanges 훅의 핵심 로직 테스트
 * (React 훅 자체는 서버 테스트에서 직접 호출할 수 없으므로 순수 로직을 테스트)
 */

interface DirtyState {
  [key: string]: boolean;
}

// 훅의 핵심 로직을 순수 함수로 추출하여 테스트
function markDirty(state: DirtyState, tabKey: string): DirtyState {
  return { ...state, [tabKey]: true };
}

function markClean(state: DirtyState, tabKey: string): DirtyState {
  return { ...state, [tabKey]: false };
}

function markAllClean(): DirtyState {
  return {};
}

function hasUnsavedChanges(state: DirtyState): boolean {
  return Object.values(state).some(Boolean);
}

function isTabDirty(state: DirtyState, tabKey: string): boolean {
  return !!state[tabKey];
}

function getDirtyTabs(state: DirtyState): string[] {
  return Object.entries(state)
    .filter(([, dirty]) => dirty)
    .map(([key]) => key);
}

// 기본정보 변경 감지 로직
function detectBasicFormChange(
  current: Record<string, any>,
  initial: Record<string, any>
): boolean {
  return Object.keys(current).some(
    (key) => String(current[key]) !== String(initial[key])
  );
}

describe("Unsaved Changes - Core Logic", () => {
  describe("markDirty", () => {
    it("should mark a tab as dirty", () => {
      const state = markDirty({}, "basic");
      expect(state.basic).toBe(true);
    });

    it("should mark multiple tabs as dirty", () => {
      let state: DirtyState = {};
      state = markDirty(state, "basic");
      state = markDirty(state, "sales");
      state = markDirty(state, "seo");
      expect(state.basic).toBe(true);
      expect(state.sales).toBe(true);
      expect(state.seo).toBe(true);
    });

    it("should not affect other tabs", () => {
      let state: DirtyState = {};
      state = markDirty(state, "basic");
      expect(state.sales).toBeUndefined();
    });
  });

  describe("markClean", () => {
    it("should mark a tab as clean", () => {
      let state: DirtyState = { basic: true };
      state = markClean(state, "basic");
      expect(state.basic).toBe(false);
    });

    it("should not affect other dirty tabs", () => {
      let state: DirtyState = { basic: true, sales: true };
      state = markClean(state, "basic");
      expect(state.basic).toBe(false);
      expect(state.sales).toBe(true);
    });
  });

  describe("markAllClean", () => {
    it("should reset all dirty states", () => {
      const state = markAllClean();
      expect(Object.keys(state).length).toBe(0);
      expect(hasUnsavedChanges(state)).toBe(false);
    });
  });

  describe("hasUnsavedChanges", () => {
    it("should return false when no tabs are dirty", () => {
      expect(hasUnsavedChanges({})).toBe(false);
    });

    it("should return false when all tabs are clean", () => {
      expect(hasUnsavedChanges({ basic: false, sales: false })).toBe(false);
    });

    it("should return true when any tab is dirty", () => {
      expect(hasUnsavedChanges({ basic: false, sales: true })).toBe(true);
    });

    it("should return true when multiple tabs are dirty", () => {
      expect(hasUnsavedChanges({ basic: true, sales: true, seo: true })).toBe(true);
    });
  });

  describe("isTabDirty", () => {
    it("should return true for dirty tab", () => {
      expect(isTabDirty({ basic: true }, "basic")).toBe(true);
    });

    it("should return false for clean tab", () => {
      expect(isTabDirty({ basic: false }, "basic")).toBe(false);
    });

    it("should return false for non-existent tab", () => {
      expect(isTabDirty({}, "nonexistent")).toBe(false);
    });
  });

  describe("getDirtyTabs", () => {
    it("should return empty array when no tabs are dirty", () => {
      expect(getDirtyTabs({})).toEqual([]);
    });

    it("should return only dirty tab keys", () => {
      const state: DirtyState = {
        basic: true,
        sales: false,
        stock: true,
        images: false,
        seo: true,
      };
      const dirty = getDirtyTabs(state);
      expect(dirty).toContain("basic");
      expect(dirty).toContain("stock");
      expect(dirty).toContain("seo");
      expect(dirty).not.toContain("sales");
      expect(dirty).not.toContain("images");
      expect(dirty.length).toBe(3);
    });
  });

  describe("detectBasicFormChange", () => {
    it("should detect no change when values are identical", () => {
      const initial = { name: "Test", price: "100", stock: "50" };
      const current = { name: "Test", price: "100", stock: "50" };
      expect(detectBasicFormChange(current, initial)).toBe(false);
    });

    it("should detect change when a value differs", () => {
      const initial = { name: "Test", price: "100", stock: "50" };
      const current = { name: "Test Changed", price: "100", stock: "50" };
      expect(detectBasicFormChange(current, initial)).toBe(true);
    });

    it("should handle numeric string comparison correctly", () => {
      const initial = { price: 100 };
      const current = { price: "100" };
      expect(detectBasicFormChange(current, initial)).toBe(false);
    });

    it("should detect change when number value changes", () => {
      const initial = { price: "100" };
      const current = { price: "200" };
      expect(detectBasicFormChange(current, initial)).toBe(true);
    });

    it("should detect change when categoryId changes", () => {
      const initial = { categoryId: 1 };
      const current = { categoryId: 2 };
      expect(detectBasicFormChange(current, initial)).toBe(true);
    });
  });

  describe("Tab change confirmation logic", () => {
    it("should allow tab change when current tab is clean", () => {
      const state: DirtyState = { sales: false };
      const currentTab = "sales";
      // If current tab is not dirty, allow change
      const canSwitch = !state[currentTab];
      expect(canSwitch).toBe(true);
    });

    it("should block tab change when current tab is dirty", () => {
      const state: DirtyState = { sales: true };
      const currentTab = "sales";
      const canSwitch = !state[currentTab];
      expect(canSwitch).toBe(false);
    });

    it("should allow navigation when no unsaved changes", () => {
      const state: DirtyState = { basic: false, sales: false };
      expect(hasUnsavedChanges(state)).toBe(false);
    });

    it("should block navigation when there are unsaved changes", () => {
      const state: DirtyState = { basic: true };
      expect(hasUnsavedChanges(state)).toBe(true);
    });
  });

  describe("Save and clean workflow", () => {
    it("should clean tab after successful save", () => {
      let state: DirtyState = { basic: true, sales: true };
      // Simulate saving basic info
      state = markClean(state, "basic");
      expect(state.basic).toBe(false);
      expect(state.sales).toBe(true);
      expect(hasUnsavedChanges(state)).toBe(true);
    });

    it("should have no unsaved changes after saving all dirty tabs", () => {
      let state: DirtyState = { basic: true, sales: true, seo: true };
      state = markClean(state, "basic");
      state = markClean(state, "sales");
      state = markClean(state, "seo");
      expect(hasUnsavedChanges(state)).toBe(false);
    });

    it("should track dirty state through edit-save-edit cycle", () => {
      let state: DirtyState = {};
      
      // Edit
      state = markDirty(state, "basic");
      expect(hasUnsavedChanges(state)).toBe(true);
      
      // Save
      state = markClean(state, "basic");
      expect(hasUnsavedChanges(state)).toBe(false);
      
      // Edit again
      state = markDirty(state, "basic");
      expect(hasUnsavedChanges(state)).toBe(true);
    });
  });

  describe("Tab label mapping", () => {
    it("should map tab keys to Korean labels", () => {
      const TAB_LABELS: Record<string, string> = {
        basic: "기본정보",
        sales: "판매정보",
        stock: "재고",
        images: "이미지",
        seo: "SEO",
        shipping: "배송/프로모션",
      };

      expect(TAB_LABELS["basic"]).toBe("기본정보");
      expect(TAB_LABELS["sales"]).toBe("판매정보");
      expect(TAB_LABELS["stock"]).toBe("재고");
      expect(TAB_LABELS["images"]).toBe("이미지");
      expect(TAB_LABELS["seo"]).toBe("SEO");
      expect(TAB_LABELS["shipping"]).toBe("배송/프로모션");
    });

    it("should generate dirty tab labels correctly", () => {
      const TAB_LABELS: Record<string, string> = {
        basic: "기본정보",
        sales: "판매정보",
        stock: "재고",
        images: "이미지",
        seo: "SEO",
        shipping: "배송/프로모션",
      };

      const dirtyTabs = ["basic", "seo"];
      const labels = dirtyTabs.map((tab) => TAB_LABELS[tab] || tab).join(", ");
      expect(labels).toBe("기본정보, SEO");
    });
  });
});
