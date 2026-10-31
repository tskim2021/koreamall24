import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CompareProduct {
  id: number;
  name: string;
  nameJa: string;
  price: string;
  originalPrice?: string | null;
  imageUrl?: string | null;
  rating?: string | null;
  reviewCount?: number;
  brand?: string | null;
  brandJa?: string | null;
  activeIngredient?: string | null;
  activeIngredientJa?: string | null;
  volume?: string | null;
  categoryId?: number;
}

interface CompareContextType {
  compareItems: CompareProduct[];
  addToCompare: (product: CompareProduct) => boolean;
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isInCompare: (productId: number) => boolean;
  compareCount: number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_ITEMS = 4;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<CompareProduct[]>([]);

  const addToCompare = useCallback((product: CompareProduct) => {
    if (compareItems.length >= MAX_COMPARE_ITEMS) return false;
    if (compareItems.some((item) => item.id === product.id)) return false;
    setCompareItems((prev) => [...prev, product]);
    return true;
  }, [compareItems]);

  const removeFromCompare = useCallback((productId: number) => {
    setCompareItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareItems([]);
  }, []);

  const isInCompare = useCallback(
    (productId: number) => compareItems.some((item) => item.id === productId),
    [compareItems]
  );

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        compareCount: compareItems.length,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used within CompareProvider");
  return context;
}
