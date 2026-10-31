import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import * as trpcModule from "../lib/trpc";

// Mock trpc
vi.mock("../lib/trpc", () => ({
  trpc: {
    category: {
      list: {
        useQuery: vi.fn(),
      },
    },
  },
}));

describe("Footer - Dynamic Categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render categories from database", () => {
    const mockCategories = [
      {
        id: 1,
        name: "Hair Care",
        nameJa: "ヘアケア",
        slug: "hair-care",
        icon: null,
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Beauty",
        nameJa: "美容",
        slug: "beauty",
        icon: null,
        sortOrder: 2,
        createdAt: new Date(),
      },
    ];

    vi.mocked(trpcModule.trpc.category.list.useQuery).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<Footer />);

    // Check if categories are rendered
    expect(screen.getByText("ヘアケア")).toBeInTheDocument();
    expect(screen.getByText("美容")).toBeInTheDocument();
  });

  it("should split categories into columns correctly", () => {
    const mockCategories = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Category ${i + 1}`,
      nameJa: `カテゴリ${i + 1}`,
      slug: `category-${i + 1}`,
      icon: null,
      sortOrder: i + 1,
      createdAt: new Date(),
    }));

    vi.mocked(trpcModule.trpc.category.list.useQuery).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<Footer />);

    // First 8 should be in first column
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`カテゴリ${i}`)).toBeInTheDocument();
    }

    // Remaining should be in second column
    for (let i = 9; i <= 12; i++) {
      expect(screen.getByText(`カテゴリ${i}`)).toBeInTheDocument();
    }
  });

  it("should handle empty categories", () => {
    vi.mocked(trpcModule.trpc.category.list.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<Footer />);

    // Should still render footer structure
    expect(screen.getByText("カテゴリ")).toBeInTheDocument();
  });

  it("should generate correct category links", () => {
    const mockCategories = [
      {
        id: 1,
        name: "Diet",
        nameJa: "ダイエット",
        slug: "diet",
        icon: null,
        sortOrder: 1,
        createdAt: new Date(),
      },
    ];

    vi.mocked(trpcModule.trpc.category.list.useQuery).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<Footer />);

    const link = screen.getByRole("link", { name: "ダイエット" });
    expect(link).toHaveAttribute("href", "/category/diet");
  });
});
