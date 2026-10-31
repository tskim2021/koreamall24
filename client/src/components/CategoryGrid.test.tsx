import { describe, it, expect } from "vitest";

// getCategoryIcon 함수 테스트
const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  if (name.includes("美容") || name.includes("スキンケア") || name.includes("ニキビ")) return "Sparkles";
  if (name.includes("AGA") || name.includes("薄毛")) return "Leaf";
  if (name.includes("男性") || name.includes("ED")) return "Dumbbell";
  if (name.includes("健康")) return "Heart";
  if (name.includes("ダイエット")) return "Scale";
  if (name.includes("スマート") || name.includes("ドラッグ")) return "Zap";
  if (name.includes("性病") || name.includes("感染症") || name.includes("抗生剤")) return "Shield";
  if (name.includes("ピル")) return "Pill";
  if (name.includes("睡眠") || name.includes("メンタル")) return "Moon";
  if (name.includes("女性")) return "Flower2";
  if (name.includes("ジェネリック")) return "Droplet";
  if (name.includes("ステロイド") || name.includes("アナボリック")) return "Dumbbell";
  
  return "Heart"; // 기본값
};

describe("CategoryGrid - getCategoryIcon", () => {
  it("should return Sparkles for beauty categories", () => {
    expect(getCategoryIcon("美容・スキンケア・ニキビ")).toBe("Sparkles");
  });

  it("should return Leaf for AGA categories", () => {
    expect(getCategoryIcon("AGA・薄毛の治療")).toBe("Leaf");
  });

  it("should return Dumbbell for male care categories", () => {
    expect(getCategoryIcon("男性ケア・ED治療")).toBe("Dumbbell");
  });

  it("should return Heart for health care categories", () => {
    expect(getCategoryIcon("健康ケア")).toBe("Heart");
  });

  it("should return Scale for diet categories", () => {
    expect(getCategoryIcon("ダイエット")).toBe("Scale");
  });

  it("should return Zap for smart drug categories", () => {
    expect(getCategoryIcon("スマートドラッグ")).toBe("Zap");
  });

  it("should return Shield for STI categories", () => {
    expect(getCategoryIcon("性病・感染症・抗生剤")).toBe("Shield");
  });

  it("should return Pill for pill categories", () => {
    expect(getCategoryIcon("低用量ピル・アフターピル")).toBe("Pill");
  });

  it("should return Moon for sleep/mental categories", () => {
    expect(getCategoryIcon("睡眠・メンタルケア")).toBe("Moon");
  });

  it("should return Flower2 for female care categories", () => {
    expect(getCategoryIcon("女性ケア")).toBe("Flower2");
  });

  it("should return Droplet for generic drug categories", () => {
    expect(getCategoryIcon("その他ジェネリック医薬品")).toBe("Droplet");
  });

  it("should return Dumbbell for steroid categories", () => {
    expect(getCategoryIcon("アナボリック ステロイド")).toBe("Dumbbell");
  });

  it("should return Heart as default for unknown categories", () => {
    expect(getCategoryIcon("テストカテゴリー")).toBe("Heart");
  });
});
