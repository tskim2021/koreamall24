import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { ChevronRight, Package, Search, X, SlidersHorizontal } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import HomeSidebar from "@/components/HomeSidebar";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type SortBy = "newest" | "oldest" | "price_asc" | "price_desc" | "rating" | "popular";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
  { value: "rating", label: "評価順" },
  { value: "price_asc", label: "価格が安い順" },
  { value: "price_desc", label: "価格が高い順" },
  { value: "oldest", label: "古い順" },
];

const MAX_PRICE = 20000;
const PAGE_SIZE = 30;

export default function Category() {
  const { slug } = useParams<{ slug: string }>();

  // 필터 상태
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, MAX_PRICE]);
  const [priceApplied, setPriceApplied] = useState<[number, number]>([0, MAX_PRICE]);
  const [discountOnly, setDiscountOnly] = useState(false);

  // 무한 스크롤 상태
  const [offset, setOffset] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // withProducts:true 로 카테고리 + 초기 상품을 한 번에 로드 (직렬 요청 제거)
  const { data: categoryData, isLoading: categoryLoading } = trpc.category.getBySlug.useQuery(
    { slug: slug || "", withProducts: true },
    { enabled: !!slug, staleTime: 1000 * 60 * 10 }
  );
  const category = categoryData as any;

  // 필터가 있을 때만 getByCategory 쿼리 실행 (기본 정렬은 initialProducts 사용)
  const hasFilter = !!(search || priceApplied[0] > 0 || priceApplied[1] < MAX_PRICE || discountOnly);

  const queryInput = useMemo(() => ({
    categoryId: category?.id || 0,
    search: search || undefined,
    sortBy,
    minPrice: priceApplied[0] > 0 ? priceApplied[0] : undefined,
    maxPrice: priceApplied[1] < MAX_PRICE ? priceApplied[1] : undefined,
    discountOnly: discountOnly || undefined,
    limit: PAGE_SIZE,
    offset,
  }), [category?.id, search, sortBy, priceApplied, discountOnly, offset]);

  const { data: pageProducts, isLoading: productsLoading } = trpc.product.getByCategory.useQuery(
    queryInput,
    {
      enabled: !!category?.id && (hasFilter || sortBy !== 'newest' || offset > 0),
      staleTime: 1000 * 60 * 10,
    }
  );

  // 필터 변경 시 목록 초기화
  const filterKey = useMemo(() =>
    `${search}|${sortBy}|${priceApplied[0]}|${priceApplied[1]}|${discountOnly}`,
    [search, sortBy, priceApplied, discountOnly]
  );

  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setOffset(0);
      setAllProducts([]);
      setHasMore(true);
    }
  }, [filterKey]);

  // initialProducts: 서버에서 카테고리와 함께 내려온 초기 상품 (필터 없는 newest 정렬)
  const initialProducts = (category as any)?.initialProducts as any[] | undefined;

  // 필터/정렬 변경 시는 pageProducts 사용, 기본은 initialProducts 사용
  const sourceProducts = (hasFilter || sortBy !== 'newest') ? pageProducts : (offset === 0 ? initialProducts : pageProducts);

  // 페이지 데이터 누적 (중복 id 제거)
  useEffect(() => {
    if (!sourceProducts) return;
    if (offset === 0) {
      setAllProducts(sourceProducts);
    } else {
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p: any) => p.id));
        const newItems = sourceProducts.filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    }
    setHasMore(sourceProducts.length === PAGE_SIZE);
    setIsLoadingMore(false);
  }, [sourceProducts, offset]);

  // 카테고리 상품 이미지 프리페치 - 유휴 시간에 브라우저 캐시에 미리 로드
  useImagePrefetch(allProducts);

  // ref로 최신 상태 유지 (observer 재등록 방지)
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(categoryLoading || productsLoading);
  const productsLoadingRef = useRef(productsLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { isLoadingRef.current = categoryLoading || productsLoading; }, [categoryLoading, productsLoading]);
  useEffect(() => { productsLoadingRef.current = productsLoading; }, [productsLoading]);
  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);

  // callback ref: DOM 연결 즉시 observer 등록
  const setLoaderRef = useCallback((el: HTMLDivElement | null) => {
    (loaderRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting && hasMoreRef.current && !isLoadingRef.current && !isLoadingMoreRef.current) {
          setIsLoadingMore(true);
          setOffset((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  // 활성 필터 수
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (sortBy !== "newest") count++;
    if (priceApplied[0] > 0 || priceApplied[1] < MAX_PRICE) count++;
    if (discountOnly) count++;
    return count;
  }, [search, sortBy, priceApplied, discountOnly]);

  const handleSearch = () => setSearch(searchInput.trim());
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };
  const clearSearch = () => { setSearchInput(""); setSearch(""); };

  const applyPrice = () => setPriceApplied([...priceRange]);

  const resetFilters = () => {
    setSearch(""); setSearchInput("");
    setSortBy("newest");
    setPriceRange([0, MAX_PRICE]);
    setPriceApplied([0, MAX_PRICE]);
    setDiscountOnly(false);
  };

  const formatPrice = (v: number) =>
    v >= MAX_PRICE ? "最大" : v === 0 ? "0" : `${(v / 1000).toFixed(0)}千`;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={category?.nameJa || "カテゴリー"}
        description={`${category?.nameJa || "カテゴリー"}の日本医薬品・健康商品をご確認ください。`}
        ogType="website"
      />
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container py-3">
            <nav className="flex items-center gap-1.5 text-xs text-gray-500">
              <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-gray-700 font-medium">{category?.nameJa || "カテゴリー"}</span>
            </nav>
          </div>
        </div>

        <div className="container py-4">
          <div className="flex gap-4 items-start">

            {/* 왼쪽 사이드바 - 카테고리 목록 + 상단배너만 표시 */}
            <HomeSidebar compact />

            {/* 우측 콘텐츠 */}
            <div className="flex-1 min-w-0">

          {/* Category Header */}
          <div className="mb-3">
            <h1 className="text-xl font-bold">{category?.nameJa || "カテゴリー"}</h1>
            {allProducts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {allProducts.length}件表示中
                {activeFilterCount > 0 && <span className="ml-2 text-primary">（フィルター適用中）</span>}
              </p>
            )}
          </div>

          {/* --- 한 줄 필터 바 --- */}
          <div className="flex flex-wrap items-center gap-2 bg-card border rounded-lg px-3 py-2 mb-4">
            {/* 정렬 아이콘 + 드롭다운 */}
            <div className="flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="h-8 w-32 text-xs border-0 bg-transparent shadow-none focus:ring-0 px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-6 bg-border shrink-0" />

            {/* 가격 슬라이더 */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">価格</span>
              <div className="flex flex-col items-center gap-0.5 w-36">
                <Slider
                  min={0}
                  max={MAX_PRICE}
                  step={500}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  className="w-full"
                />
                <div className="flex justify-between w-full text-[10px] text-muted-foreground">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs shrink-0"
                onClick={applyPrice}
              >
                GO
              </Button>
            </div>

            <div className="w-px h-6 bg-border shrink-0" />

            {/* 할인 체크박스 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Checkbox
                id="discountOnly"
                checked={discountOnly}
                onCheckedChange={(c) => setDiscountOnly(!!c)}
                className="h-4 w-4"
              />
              <Label htmlFor="discountOnly" className="text-xs font-semibold text-primary cursor-pointer whitespace-nowrap">
                割引
              </Label>
            </div>

            <div className="w-px h-6 bg-border shrink-0" />

            {/* 검색 */}
            <div className="flex items-center gap-1 flex-1 min-w-[140px]">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 pr-7 text-xs"
                  placeholder="商品名で検索..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchInput && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={clearSearch}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Button size="sm" className="h-8 px-3 text-xs shrink-0" onClick={handleSearch}>
                検索
              </Button>
            </div>

            {/* 리셋 버튼 */}
            {activeFilterCount > 0 && (
              <>
                <div className="w-px h-6 bg-border shrink-0" />
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="w-3 h-3" />
                  リセット
                  <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </Badge>
                </button>
              </>
            )}
          </div>

          {/* --- 상품 그리드 (5열, 정사각형 썸네일) --- */}
          {(categoryLoading && !initialProducts) || ((hasFilter || sortBy !== 'newest') && productsLoading && offset === 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-secondary rounded-lg mb-2" />
                  <div className="h-3 bg-secondary rounded w-3/4 mb-1" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : allProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {allProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={category?.nameJa}
                  />
                ))}
              </div>

              {/* 무한 스크롤 트리거 */}
              <div ref={setLoaderRef} className="py-6 flex justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    読み込み中...
                  </div>
                )}
                {!hasMore && allProducts.length > 0 && (
                  <p className="text-xs text-muted-foreground">全{allProducts.length}件を表示しました</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              {activeFilterCount > 0 ? (
                <>
                  <h2 className="text-lg font-bold mb-2">条件に合う商品がありません</h2>
                  <p className="text-sm text-muted-foreground mb-4">フィルターを変更してお試しください</p>
                  <Button variant="outline" onClick={resetFilters}>フィルターをリセット</Button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-2">商品がありません</h2>
                  <p className="text-sm text-muted-foreground mb-4">このカテゴリーにはまだ商品がありません</p>
                  <Link href="/"><Button>トップページへ戻る</Button></Link>
                </>
              )}
            </div>
          )}
            </div>{/* end 우측 콘텐츠 */}
          </div>{/* end flex */}
        </div>
      </main>
      <Footer />
    </div>
  );
}
