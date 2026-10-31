{/* 필터 바 - 한 줄 통합 */}
<div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
  <div className="flex-1 min-w-[200px]">
    <label className="block text-xs font-medium text-gray-600 mb-1">상품명</label>
    <Input
      placeholder="검색..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="h-9"
    />
  </div>
  <div className="w-40">
    <label className="block text-xs font-medium text-gray-600 mb-1">카테고리</label>
    <Select
      value={filterCategory?.toString() || ""}
      onValueChange={(v) => setFilterCategory(v === "" ? null : parseInt(v))}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="모든" />
      </SelectTrigger>
      <SelectContent>
        {categories?.map((cat: any) => (
          <SelectItem key={cat.id} value={cat.id.toString()}>
            {cat.nameJa}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="w-28">
    <label className="block text-xs font-medium text-gray-600 mb-1">최소가격</label>
    <Input
      placeholder="최소"
      type="number"
      value={filterPriceMin}
      onChange={(e) => setFilterPriceMin(e.target.value)}
      className="h-9"
    />
  </div>
  <div className="w-28">
    <label className="block text-xs font-medium text-gray-600 mb-1">최대가격</label>
    <Input
      placeholder="최대"
      type="number"
      value={filterPriceMax}
      onChange={(e) => setFilterPriceMax(e.target.value)}
      className="h-9"
    />
  </div>
  <div className="flex items-center gap-3 h-9">
    <label className="flex items-center gap-2 whitespace-nowrap">
      <input
        type="checkbox"
        checked={filterTimeSale}
        onChange={(e) => setFilterTimeSale(e.target.checked)}
        className="rounded w-4 h-4"
      />
      <span className="text-sm">타임세일</span>
    </label>
    <label className="flex items-center gap-2 whitespace-nowrap">
      <input
        type="checkbox"
        checked={filterMonthlySale}
        onChange={(e) => setFilterMonthlySale(e.target.checked)}
        className="rounded w-4 h-4"
      />
      <span className="text-sm">월간세일</span>
    </label>
    <label className="flex items-center gap-2 whitespace-nowrap">
      <input
        type="checkbox"
        checked={filterLowStock}
        onChange={(e) => setFilterLowStock(e.target.checked)}
        className="rounded w-4 h-4"
      />
      <span className="text-sm">재고부족</span>
    </label>
  </div>
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      setSearchQuery("");
      setFilterCategory(null);
      setFilterPriceMin("");
      setFilterPriceMax("");
      setFilterTimeSale(false);
      setFilterMonthlySale(false);
      setFilterLowStock(false);
    }}
    className="h-9"
  >
    초기화
  </Button>
</div>
