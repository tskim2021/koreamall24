import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminProductNew() {
  const [, navigate] = useLocation();
  const [creating, setCreating] = useState(false);

  const createProductMutation = trpc.admin.createProduct.useMutation({
    onSuccess: (data) => {
      toast.success("상품이 생성되었습니다. 상세 페이지에서 정보를 입력하세요.");
      navigate(`/admin/products/${data.product.id}`);
    },
    onError: (error) => {
      toast.error(`상품 생성 실패: ${error.message}`);
      setCreating(false);
    },
  });

  useEffect(() => {
    if (creating) return;
    setCreating(true);
    // 임시 상품 자동 생성 (비노출 상태)
    createProductMutation.mutate({
      name: "신규 상품 (임시)",
      nameJa: "新規商品（仮）",
      categoryId: 1,
      price: 0,
      inStock: false,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">상품 번호를 생성하는 중...</p>
      </div>
    </AdminLayout>
  );
}
