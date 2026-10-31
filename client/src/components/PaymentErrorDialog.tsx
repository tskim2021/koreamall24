/**
 * PaymentErrorDialog
 * Displays payment error with retry and alternative payment method options
 */

import { AlertCircle, RotateCcw, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { PaymentErrorInfo } from "@/../../shared/utils/paymentErrorHandler";
import { getRetryMessage } from "@/../../shared/utils/paymentErrorHandler";

interface PaymentErrorDialogProps {
  open: boolean;
  errorInfo: PaymentErrorInfo | null;
  onRetry: () => void;
  onChangePaymentMethod: () => void;
  onClose: () => void;
  isRetrying?: boolean;
}

export default function PaymentErrorDialog({
  open,
  errorInfo,
  onRetry,
  onChangePaymentMethod,
  onClose,
  isRetrying = false,
}: PaymentErrorDialogProps) {
  if (!errorInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-red-600">
              {errorInfo.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{errorInfo.message}</p>
          </div>

          {/* Retry Suggestion */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">{getRetryMessage(errorInfo)}</p>
          </div>

          {/* Provider Info */}
          <div className="text-xs text-gray-500">
            <p>
              決済方法: <span className="font-medium capitalize">{errorInfo.provider}</span>
            </p>
            {errorInfo.originalError && (
              <p className="mt-1 text-gray-400">エラーコード: {errorInfo.originalError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          {/* Change Payment Method Button */}
          <Button
            variant="outline"
            onClick={onChangePaymentMethod}
            className="w-full gap-2"
            disabled={isRetrying}
          >
            <CreditCard className="w-4 h-4" />
            支払い方法を変更
          </Button>

          {/* Retry Button (only if retryable) */}
          {errorInfo.retryable && (
            <Button
              onClick={onRetry}
              className="w-full gap-2 bg-pink-600 hover:bg-pink-700"
              disabled={isRetrying}
            >
              <RotateCcw className="w-4 h-4" />
              {isRetrying ? "再試行中..." : "もう一度試す"}
            </Button>
          )}

          {/* Close Button (if not retryable) */}
          {!errorInfo.retryable && (
            <Button
              onClick={onClose}
              className="w-full"
              variant="default"
            >
              閉じる
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
