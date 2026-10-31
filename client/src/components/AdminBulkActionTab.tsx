import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatPrice } from "@/../../shared/utils/formatPrice";

interface BulkUpdateData {
  categoryId?: number;
  price?: number;
  originalPrice?: number;
  isTimeSale?: boolean;
  isMonthlySale?: boolean;
}

export default function AdminBulkActionTab() {
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkData, setBulkData] = useState<BulkUpdateData>({});
  const [selectAll, setSelectAll] = useState(false);

  const { data: productsData, isLoading, refetch } = trpc.admin.products.list.useQuery({
    page,
    limit: 20,
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("상품이 업데이트되었습니다");
    },
    onError: (error) => {
      toast.error(error.message || "업데이트에 실패했습니다");
    },
  });

  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set<number>(
        productsData?.products?.map((p: any) => p.id as number) || []
      );
      setSelectedProducts(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("상품을 선택해주세요");
      return;
    }

    if (Object.keys(bulkData).length === 0) {
      toast.error("업데이트 내용을 입력해주세요");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const productId of Array.from(selectedProducts)) {
      try {
        await updateProduct.mutateAsync({
          productId,
          ...bulkData,
        } as any);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast.success(
      `${successCount}개의 상품이 업데이트되었습니다${
        errorCount > 0 ? `（${errorCount}개실패）` : ""
      }`
    );

    setSelectedProducts(new Set());
    setSelectAll(false);
    setBulkData({});
    refetch();
  };

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          여러 상품을 선택하여 일괄로 정보를 업데이트할 수 있습니다.
        </p>
      </div>

      {/* 상품 선택 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 text-left">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-3">상품명</th>
              <th className="text-right p-3">현재 가격</th>
              <th className="text-center p-3">선택</th>
            </tr>
          </thead>
          <tbody>
            {productsData?.products && productsData.products.length > 0 ? (
              productsData.products.map((product: any) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => handleSelectProduct(product.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.nameJa}</p>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {formatPrice(product.price)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        selectedProducts.has(product.id)
                          ? "bg-primary text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {selectedProducts.has(product.id) ? "선택됨" : "미선택"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  상품이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 일괄 업데이트폼 */}
      <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
        <h3 className="font-semibold">일괄 업데이트내용</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">새 가격</label>
            <Input
              type="number"
              placeholder="가격 입력"
              value={bulkData.price || ""}
              onChange={(e) =>
                setBulkData({
                  ...bulkData,
                  price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">정가</label>
            <Input
              type="number"
              placeholder="정가 입력"
              value={bulkData.originalPrice || ""}
              onChange={(e) =>
                setBulkData({
                  ...bulkData,
                  originalPrice: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">타임 세일</label>
            <Select
              value={
                bulkData.isTimeSale !== undefined
                  ? bulkData.isTimeSale
                    ? "true"
                    : "false"
                  : "unchanged"
              }
              onValueChange={(value) => {
                if (value === "unchanged") {
                  const { isTimeSale, ...rest } = bulkData;
                  setBulkData(rest);
                } else {
                  setBulkData({
                    ...bulkData,
                    isTimeSale: value === "true",
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="변경 안 함" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">변경 안 함</SelectItem>
                <SelectItem value="true">활성</SelectItem>
                <SelectItem value="false">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">월간 세일</label>
            <Select
              value={
                bulkData.isMonthlySale !== undefined
                  ? bulkData.isMonthlySale
                    ? "true"
                    : "false"
                  : "unchanged"
              }
              onValueChange={(value) => {
                if (value === "unchanged") {
                  const { isMonthlySale, ...rest } = bulkData;
                  setBulkData(rest);
                } else {
                  setBulkData({
                    ...bulkData,
                    isMonthlySale: value === "true",
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="변경 안 함" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">변경 안 함</SelectItem>
                <SelectItem value="true">활성</SelectItem>
                <SelectItem value="false">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setBulkData({});
              setSelectedProducts(new Set());
              setSelectAll(false);
            }}
          >
            초기화
          </Button>
          <Button
            onClick={handleBulkUpdate}
            disabled={selectedProducts.size === 0 || Object.keys(bulkData).length === 0}
          >
            {selectedProducts.size > 0
              ? `${selectedProducts.size}개의 상품을 업데이트`
              : "상품 선택"}
          </Button>
        </div>
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
