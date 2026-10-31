import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TAB_LABELS: Record<string, string> = {
  basic: "基本情報",
  sales: "販売情報",
  stock: "在庫",
  images: "画像",
  seo: "SEO",
  shipping: "配送/プロモーション",
};

interface UnsavedChangesDialogProps {
  open: boolean;
  dirtyTabs: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  dirtyTabs,
  onConfirm,
  onCancel,
}: UnsavedChangesDialogProps) {
  const dirtyLabels = dirtyTabs
    .map((tab) => TAB_LABELS[tab] || tab)
    .join(", ");

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-amber-500"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            保存されていない変更があります
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              以下のセクションに保存されていない変更があります:
            </span>
            <span className="block font-medium text-foreground">
              {dirtyLabels}
            </span>
            <span className="block text-sm">
              このページを離れると、変更内容がすべて失われます。続けますか？
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            戻る
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            変更を破棄して移動
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
