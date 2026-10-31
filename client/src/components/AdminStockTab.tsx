import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function AdminStockTab() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingStock, setEditingStock] = useState<number | null>(null);

  const { data: productsData, isLoading, refetch } = trpc.admin.products.list.useQuery({
    page,
    limit: 20,
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("재고가 업데이트되었습니다");
      setEditingProductId(null);
      setEditingStock(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "업데이트에 실패했습니다");
    },
  });

  const handleStockUpdate = (productId: number, newStock: number) => {
    updateProduct.mutate({
      productId,
      stock: newStock,
    } as any);
  };

  const filteredProducts = productsData?.products?.filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.nameJa.includes(searchQuery)
  ) || [];

  const lowStockProducts = filteredProducts.filter((p: any) => p.stock < 10);

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 재고 부족 알림 */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">재고 부족 알림</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockProducts.length}개의 상품 재고가 10개 미만입니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div>
        <label className="text-sm font-medium mb-1 block">상품 검색</label>
        <Input
          placeholder="상품명으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 재고테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-3">상품명</th>
              <th className="text-left p-3">카테고리</th>
              <th className="text-right p-3">현재 재고</th>
              <th className="text-center p-3">상태</th>
              <th className="text-center p-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product: any) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.nameJa}</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{product.categoryId}</td>
                  <td className="p-3 text-right">
                    {editingProductId === product.id ? (
                      <Input
                        type="number"
                        value={editingStock ?? product.stock}
                        onChange={(e) => setEditingStock(parseInt(e.target.value))}
                        className="w-20 text-right"
                        min="0"
                      />
                    ) : (
                      <span
                        className={`font-semibold ${
                          product.stock < 10 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {product.stock < 10 ? (
                      <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        부족
                      </span>
                    ) : product.stock < 50 ? (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        주의
                      </span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        충분
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {editingProductId === product.id ? (
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStockUpdate(product.id, editingStock ?? product.stock)
                          }
                          disabled={editingStock === null}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProductId(null);
                            setEditingStock(null);
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProductId(product.id);
                          setEditingStock(product.stock);
                        }}
                      >
                        편집
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  상품을 찾을 수 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {productsData && (productsData.products?.length ?? 0) >= 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4">페이지 {page}</span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
