import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import SharedProductCard from "@/components/ProductCard";
import type { Product } from "@shared/types";

const CATEGORIES = [
  { id: 190, name: "ビタミン" },
  { id: 200, name: "栄養剤・サプリメント" },
  { id: 210, name: "乳酸菌" },
  { id: 220, name: "スリミング・インナービューティー" },
];

// ── Generic drag-to-scroll hook ───────────────────────────────────────────────
function useDragScroll(onReachEnd: () => void, onReachStart: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    dragMoved.current = false;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = "grabbing";
    ref.current.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    dragMoved.current = true;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current || !ref.current) return;
    isDragging.current = false;
    ref.current.style.cursor = "grab";
    ref.current.style.userSelect = "";

    if (!dragMoved.current) return;

    const el = ref.current;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    const atStart = el.scrollLeft <= 8;
    const delta = scrollLeft.current - el.scrollLeft;

    if (atEnd && delta > 0) onReachEnd();
    else if (atStart && delta < 0) onReachStart();
  }, [onReachEnd, onReachStart]);

  const onMouseLeave = useCallback(() => {
    if (isDragging.current && ref.current) {
      isDragging.current = false;
      ref.current.style.cursor = "grab";
      ref.current.style.userSelect = "";
    }
  }, []);

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}

// ── Touch swipe hook ──────────────────────────────────────────────────────────
function useTouchSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchScrollLeft = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!ref.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchScrollLeft.current = ref.current.scrollLeft;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!ref.current) return;
    const el = ref.current;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    const atStart = el.scrollLeft <= 8;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;

    if (atEnd && deltaX > 30) onSwipeLeft();
    else if (atStart && deltaX < -30) onSwipeRight();
  }, [onSwipeLeft, onSwipeRight]);

  return { ref, onTouchStart, onTouchEnd };
}

// ── Main component ────────────────────────────────────────────────────────────
export function StaffRecommendedProducts() {
  const [catIdx, setCatIdx] = useState(0);
  const selectedCategory = CATEGORIES[catIdx];

  const { data: categoryProducts = [], isLoading } = trpc.product.getByCategory.useQuery(
    { categoryId: selectedCategory.id, limit: 15 },
    { enabled: true }
  );

  const products = useMemo(
    () => (Array.isArray(categoryProducts) ? categoryProducts.slice(0, 15) : []),
    [categoryProducts]
  );

  const goNext = useCallback(() => setCatIdx((p) => (p + 1) % CATEGORIES.length), []);
  const goPrev = useCallback(() => setCatIdx((p) => (p - 1 + CATEGORIES.length) % CATEGORIES.length), []);

  // PC drag
  const pcDrag = useDragScroll(goNext, goPrev);
  // Mobile drag + touch
  const mobileTouch = useTouchSwipe(goNext, goPrev);
  const mobileDrag = useDragScroll(goNext, goPrev);

  // Reset scroll on category change
  useEffect(() => {
    pcDrag.ref.current && (pcDrag.ref.current.scrollLeft = 0);
    mobileDrag.ref.current && (mobileDrag.ref.current.scrollLeft = 0);
  }, [catIdx]);

  return (
    <section className="py-6">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="jp-section-title">おすすめ商品</h2>
            <p className="text-sm text-muted-foreground -mt-2 ml-4">スタッフおすすめの商品</p>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => setCatIdx(idx)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                catIdx === idx
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* ── Mobile: 1-row horizontal scroll ── */}
        <div
          ref={(el) => {
            (mobileDrag.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
            (mobileTouch.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          className="md:hidden flex gap-3 overflow-x-auto pb-3"
          style={{ cursor: "grab", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          onMouseDown={mobileDrag.onMouseDown}
          onMouseMove={mobileDrag.onMouseMove}
          onMouseUp={mobileDrag.onMouseUp}
          onMouseLeave={mobileDrag.onMouseLeave}
          onTouchStart={mobileTouch.onTouchStart}
          onTouchEnd={mobileTouch.onTouchEnd}
        >
          {isLoading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36 bg-gray-100 rounded-md aspect-[3/4] animate-pulse" />
              ))
            : products.map((product: Product) => (
                <div key={product.id} className="flex-shrink-0 w-36 sm:w-44">
                  <SharedProductCard product={product} />
                </div>
              ))}
        </div>

        {/* ── PC: 2-row grid (5 cols ≥1024px, 4 cols 768-1023px) ── */}
        {/* overflow-hidden so dragging doesn't scroll; drag triggers category change */}
        <div
          ref={pcDrag.ref}
          className="hidden md:block overflow-hidden select-none"
          style={{ cursor: "grab" }}
          onMouseDown={pcDrag.onMouseDown}
          onMouseMove={pcDrag.onMouseMove}
          onMouseUp={pcDrag.onMouseUp}
          onMouseLeave={pcDrag.onMouseLeave}
        >
          {isLoading ? (
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-md aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="jp-card p-12 text-center">
              <p className="text-sm text-gray-600">このカテゴリに商品がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              {products.map((product: Product) => (
                <SharedProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Category dot indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {CATEGORIES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCatIdx(idx)}
              className={`transition-all rounded-full ${
                catIdx === idx ? "w-8 h-2 bg-primary" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-2 hidden md:block">
          ← ドラッグで次のカテゴリへ →
        </p>
      </div>
    </section>
  );
}
