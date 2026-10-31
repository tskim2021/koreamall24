import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

interface ImageUploadProps {
  onImageUrlChange: (url: string) => void;
  currentImageUrl?: string;
  isLoading?: boolean;
}

export function ImageUpload({ onImageUrlChange, currentImageUrl, isLoading = false }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const uploadMutation = trpc.storage.uploadImage.useMutation({
    onSuccess: (data) => {
      onImageUrlChange(data.url);
      setUploadProgress(100);
    },
    onError: (error) => {
      setError(error.message || 'アップロードに失敗しました');
      setPreviewUrl(null);
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('画像ファイルのみアップロード可能です');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await uploadToS3(file);
  };

  const uploadToS3 = async (file: File) => {
    try {
      setUploadProgress(0);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = (e.target?.result as string).split(',')[1];
          
          setUploadProgress(50);

          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64Data,
            contentType: file.type,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
          setPreviewUrl(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setPreviewUrl(null);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    onImageUrlChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploading = uploadMutation.isPending || isLoading;

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 bg-gray-50 hover:border-primary/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={previewUrl}
                alt="プレビュー"
                className="w-full h-full object-cover"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-sm font-medium">{uploadProgress}%</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                別の画像を選択
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                クリア
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              ここに画像をドラッグ&ドロップするか
            </p>
            <p className="text-xs text-gray-500 mb-4">
              クリックして画像を選択してください
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              ファイルを選択
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              対応形式: JPG, PNG, GIF, WebP (最大5MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
