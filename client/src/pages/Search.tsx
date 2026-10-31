import { useSearch, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const LIMIT = 24;

const SORT_OPTIONS = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
  { value: "price_asc", label: "価格が安い順" },
  { value: "price_desc", label: "価格が高い順" },
];

const PRICE_RANGES = [
  { label: "指定なし", min: undefined, max: undefined },
  { label: "〜¥1,000", min: undefined, max: 1000 },
  { label: "¥1,000〜¥3,000", min: 1000, max: 3000 },
  { label: "¥3,000〜¥5,000", min: 3000, max: 5000 },
  { label: "¥5,000〜¥10,000", min: 5000, max: 10000 },
  { label: "¥10,000〜", min: 10000, max: undefined },
];

export default function Search() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchString);

  const query = params.get("q") || "";
  const sortBy = (params.get("sort") || "newest") as "newest" | "oldest" | "price_asc" | "price_desc" | "popular";
  const categoryId = params.get("cat") ? Number(params.get("cat")) : undefined;
  const minPrice = params.get("min") ? Number(params.get("min")) : undefined;
  const maxPrice = params.get("max") ? Number(params.get("max")) : undefined;
  const inStockOnly = params.get("inStock") === "1";
  const discountOnly = params.get("discount") === "1";
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const offset = (page - 1) * LIMIT;

  // 검색어 입력 상태
  const [inputValue, setInputValue] = useState(query);
  const [filterOpen, setFilterOpen] = useState(false);

  // 필터 임시 상태 (Sheet 안에서 편집)
  const [tmpCategoryId, setTmpCategoryId] = useState<number | undefined>(categoryId);
  const [tmpPriceRange, setTmpPriceRange] = useState(0);
  const [tmpInStock, setTmpInStock] = useState(inStockOnly);
  const [tmpDiscount, setTmpDiscount] = useState(discountOnly);

  const trackSearch = trpc.analytics.trackSearch.useMutation();
  const lastTrackedQuery = useRef("");

  useEffect(() => {
    if (query && query.trim().length > 0 && query !== lastTrackedQuery.current) {
      lastTrackedQuery.current = query;
      trackSearch.mutate({ keyword: query.trim() });
    }
  }, [query]);

  // 검색어 변경 시 input 동기화
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // 필터 Sheet 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (filterOpen) {
      setTmpCategoryId(categoryId);
      const idx = PRICE_RANGES.findIndex(r => r.min === minPrice && r.max === maxPrice);
      setTmpPriceRange(idx >= 0 ? idx : 0);
      setTmpInStock(inStockOnly);
      setTmpDiscount(discountOnly);
    }
  }, [filterOpen]);

  const { data: categories } = trpc.category.list.useQuery();

  const searchInput = useMemo(() => ({
    query,
    limit: LIMIT,
    offset,
    sortBy,
    categoryId,
    minPrice,
    maxPrice,
    inStockOnly: inStockOnly || undefined,
    discountOnly: discountOnly || undefined,
  }), [query, offset, sortBy, categoryId, minPrice, maxPrice, inStockOnly, discountOnly]);

  const { data, isLoading } = trpc.product.search.useQuery(searchInput, {
    enabled: query.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  // URL 업데이트 헬퍼
  const updateUrl = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchString);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "0") p.delete(k);
      else p.set(k, v);
    });
    p.delete("page"); // 필터 변경 시 1페이지로
    navigate(`/search?${p.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
  };

  const handleSort = (val: string) => {
    updateUrl({ sort: val === "newest" ? undefined : val });
  };

  const handlePage = (p: number) => {
    const np = new URLSearchParams(searchString);
    if (p === 1) np.delete("page");
    else np.set("page", String(p));
    navigate(`/search?${np.toString()}`);
  };

  const applyFilters = () => {
    const range = PRICE_RANGES[tmpPriceRange];
    updateUrl({
      cat: tmpCategoryId ? String(tmpCategoryId) : undefined,
      min: range.min !== undefined ? String(range.min) : undefined,
      max: range.max !== undefined ? String(range.max) : undefined,
      inStock: tmpInStock ? "1" : undefined,
      discount: tmpDiscount ? "1" : undefined,
    });
    setFilterOpen(false);
  };

  const clearAllFilters = () => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const activeFilterCount = [
    categoryId !== undefined,
    minPrice !== undefined || maxPrice !== undefined,
    inStockOnly,
    discountOnly,
  ].filter(Boolean).length;

  const selectedCategory = categories?.find(c => c.id === categoryId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title={query ? `「${query}」の検索結果` : "商品検索"}
        description={query ? `「${query}」に関する日本の医薬品・健康商品の検索結果` : "日本の医薬品・健康商品を検索できます。"}
        keywords={query ? `${query}, 日本医薬品, 健康商品` : "日本医薬品, 健康商品, 検索"}
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
              {query ? (
                <span className="text-gray-700 font-medium">「{query}」の検索結果</span>
              ) : (
                <span className="text-gray-700 font-medium">商品検索</span>
              )}
            </nav>
          </div>
        </div>

        {/* 검색 바 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="container py-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="商品名・症状で検索する"
                  className="pl-9 h-10 bg-gray-50 border-gray-200 focus:bg-white"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => setInputValue("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button type="submit" className="h-10 px-4 shrink-0">検索</Button>
            </form>
          </div>
        </div>

        <div className="container py-4">
          {/* 결과 헤더 */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              {query ? (
                <h1 className="text-base font-bold text-gray-800">
                  「<span className="text-primary">{query}</span>」の検索結果
                  {!isLoading && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {total}件
                    </span>
                  )}
                </h1>
              ) : (
                <h1 className="text-base font-bold text-gray-800">商品検索</h1>
              )}
              {/* 활성 필터 태그 */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedCategory && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {selectedCategory.nameJa || selectedCategory.name}
                      <button onClick={() => updateUrl({ cat: undefined })}><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {(minPrice !== undefined || maxPrice !== undefined) && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {PRICE_RANGES.find(r => r.min === minPrice && r.max === maxPrice)?.label || "価格指定"}
                      <button onClick={() => updateUrl({ min: undefined, max: undefined })}><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {inStockOnly && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      在庫あり
                      <button onClick={() => updateUrl({ inStock: undefined })}><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {discountOnly && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      セール中
                      <button onClick={() => updateUrl({ discount: undefined })}><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    フィルターをクリア
                  </button>
                </div>
              )}
            </div>

            {/* 정렬 + 필터 버튼 */}
            <div className="flex items-center gap-2 shrink-0">
              <Select value={sortBy} onValueChange={handleSort}>
                <SelectTrigger className="h-9 text-xs w-[130px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs relative">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    絞り込み
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>絞り込み</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* 카테고리 */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">カテゴリー</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <button
                          onClick={() => setTmpCategoryId(undefined)}
                          className={`w-full text-left text-sm px-3 py-2 rounded transition-colors ${tmpCategoryId === undefined ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                        >
                          すべて
                        </button>
                        {categories?.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setTmpCategoryId(cat.id)}
                            className={`w-full text-left text-sm px-3 py-2 rounded transition-colors ${tmpCategoryId === cat.id ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                          >
                            {cat.nameJa || cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 가격대 */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">価格帯</h3>
                      <div className="space-y-2">
                        {PRICE_RANGES.map((range, idx) => (
                          <button
                            key={idx}
                            onClick={() => setTmpPriceRange(idx)}
                            className={`w-full text-left text-sm px-3 py-2 rounded transition-colors ${tmpPriceRange === idx ? "bg-primary text-white" : "hover:bg-gray-100"}`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 기타 필터 */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">その他</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="inStock"
                            checked={tmpInStock}
                            onCheckedChange={v => setTmpInStock(!!v)}
                          />
                          <Label htmlFor="inStock" className="text-sm cursor-pointer">在庫あり商品のみ</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="discount"
                            checked={tmpDiscount}
                            onCheckedChange={v => setTmpDiscount(!!v)}
                          />
                          <Label htmlFor="discount" className="text-sm cursor-pointer">セール中商品のみ</Label>
                        </div>
                      </div>
                    </div>

                    {/* 적용 버튼 */}
                    <div className="pt-2 space-y-2">
                      <Button onClick={applyFilters} className="w-full">絞り込みを適用</Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setTmpCategoryId(undefined);
                          setTmpPriceRange(0);
                          setTmpInStock(false);
                          setTmpDiscount(false);
                        }}
                      >
                        リセット
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* 검색어 없을 때 */}
          {!query && (
            <div className="text-center py-16">
              <SearchIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">キーワードを入力して商品を検索してください</p>
            </div>
          )}

          {/* 로딩 */}
          {query && isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="jp-card p-2 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* 결과 없음 */}
          {query && !isLoading && products.length === 0 && (
            <div className="text-center py-16">
              <SearchIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-lg font-bold mb-2 text-gray-700">商品が見つかりませんでした</h2>
              <p className="text-sm text-muted-foreground mb-2">「{query}」に一致する商品はありません。</p>
              <p className="text-xs text-muted-foreground mb-6">別のキーワードや、フィルターを変更してお試しください。</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mr-2">
                  フィルターをクリア
                </Button>
              )}
              <Link href="/" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-colors">
                トップページへ戻る
              </Link>
            </div>
          )}

          {/* 결과 목록 */}
          {query && !isLoading && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePage(page - 1)}
                    disabled={page === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePage(p as number)}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          {p}
                        </Button>
                      )
                    )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePage(page + 1)}
                    disabled={page === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* 결과 요약 */}
              <p className="text-center text-xs text-muted-foreground mt-3">
                {total}件中 {offset + 1}〜{Math.min(offset + LIMIT, total)}件を表示
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
