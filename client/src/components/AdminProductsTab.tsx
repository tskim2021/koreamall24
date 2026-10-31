import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatPrice } from "@/../../shared/utils/formatPrice";

export default function AdminProductsTab() {
  const { data, refetch } = trpc.admin.products.list.useQuery({ page: 1, limit: 100 });
  const products = data?.products || [];

  const deleteProduct = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("상품이 삭제되었습니다");
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">상품 관리</h2>
        <Button className="gap-2">
          <Plus size={20} /> 신규 상품
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">상품명</th>
                  <th className="px-4 py-2 text-left font-semibold">카테고리</th>
                  <th className="px-4 py-2 text-left font-semibold">가격</th>
                  <th className="px-4 py-2 text-left font-semibold">재고</th>
                  <th className="px-4 py-2 text-left font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.categoryId}</td>
                    <td className="px-4 py-3">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">{product.stock || 0}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Edit2 size={16} /> 편집
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteProduct.mutate({ id: product.id })}
                        className="gap-1"
                      >
                        <Trash2 size={16} /> 삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
