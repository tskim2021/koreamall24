import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImagesSelected: (urls: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

interface UploadedImage {
  file: File;
  preview: string;
  uploading?: boolean;
}

export default function ImageUploader({
  onImagesSelected,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルのみアップロード可能です");
      return false;
    }

    if (file.size > maxFileSize) {
      toast.error(`ファイルサイズは${maxFileSize / 1024 / 1024}MB以下にしてください`);
      return false;
    }

    return true;
  };

  const handleFiles = useCallback(
    (files: FileList) => {
      const newFiles = Array.from(files).filter(validateFile);

      if (images.length + newFiles.length > maxFiles) {
        toast.error(`最大${maxFiles}個のファイルをアップロードできます`);
        return;
      }

      const newImages = newFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...newImages]);
    },
    [images.length, maxFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].preview);
      return updated;
    });
  };

  const uploadImages = async () => {
    if (images.length === 0) {
      toast.error("アップロードする画像を選択してください");
      return;
    }

    try {
      setImages((prev) =>
        prev.map((img) => ({ ...img, uploading: true }))
      );

      const uploadedUrls: string[] = [];

      for (const image of images) {
        const formData = new FormData();
        formData.append("file", image.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.url);
      }

      onImagesSelected(uploadedUrls);
      setImages([]);
      toast.success("画像をアップロードしました");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("画像のアップロードに失敗しました");
      setImages((prev) =>
        prev.map((img) => ({ ...img, uploading: false }))
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 bg-gray-50 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">
              ここにドラッグ＆ドロップするか、クリックして選択
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, GIF (最大{maxFileSize / 1024 / 1024}MB)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            ファイルを選択
          </Button>
        </div>
      </div>

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            選択済み画像 ({images.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin">
                        <ImageIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={image.uploading}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {images.length > 0 && (
        <Button
          type="button"
          onClick={uploadImages}
          disabled={images.some((img) => img.uploading)}
          className="w-full"
        >
          {images.some((img) => img.uploading)
            ? "アップロード中..."
            : `${images.length}個の画像をアップロード`}
        </Button>
      )}
    </div>
  );
}
