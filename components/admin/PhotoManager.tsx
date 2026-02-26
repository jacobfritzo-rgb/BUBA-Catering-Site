"use client";

import { useState, useRef } from "react";

interface ProductPhoto {
  key: string;
  label: string;
  description: string;
}

const PRODUCT_PHOTOS: ProductPhoto[] = [
  {
    key: "party-box",
    label: "Party Box",
    description: "40 mini burekas — serves 10-15",
  },
  {
    key: "big-box",
    label: "Big Box",
    description: "8 half-size burekas — feeds 4-6",
  },
];

interface UploadedImage {
  key: string;
  content_type: string;
  updated_at: string;
}

interface PhotoManagerProps {
  uploadedImages: UploadedImage[];
  onUpdate: () => void;
}

export default function PhotoManager({ uploadedImages, onUpdate }: PhotoManagerProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const hasImage = (key: string) =>
    uploadedImages.some((img) => img.key === key);

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("file", file);

      const res = await fetch("/api/product-images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (key: string) => {
    setDeleting(key);
    setError(null);

    try {
      const res = await fetch(`/api/product-images/${key}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }

      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Upload photos for each product. Images are displayed on the main ordering page.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {PRODUCT_PHOTOS.map((product) => {
          const imageExists = hasImage(product.key);
          const isUploading = uploading === product.key;
          const isDeleting = deleting === product.key;
          const imageInfo = uploadedImages.find(
            (img) => img.key === product.key
          );

          return (
            <div
              key={product.key}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Image preview */}
              <div className="h-48 bg-gray-100 relative">
                {imageExists ? (
                  <img
                    src={`/api/product-images/${product.key}?t=${imageInfo?.updated_at || ""}`}
                    alt={product.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <svg
                        className="mx-auto h-12 w-12 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm">No photo uploaded</p>
                    </div>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white font-medium">Uploading...</div>
                  </div>
                )}
              </div>

              {/* Info and actions */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900">
                  {product.label}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {product.description}
                </p>

                <div className="flex gap-2">
                  <input
                    ref={(el) => { fileInputRefs.current[product.key] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(product.key, file);
                      e.target.value = "";
                    }}
                  />

                  <button
                    onClick={() =>
                      fileInputRefs.current[product.key]?.click()
                    }
                    disabled={isUploading}
                    className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {imageExists ? "Replace Photo" : "Upload Photo"}
                  </button>

                  {imageExists && (
                    <button
                      onClick={() => handleDelete(product.key)}
                      disabled={isDeleting}
                      className="bg-red-100 text-red-700 text-sm font-semibold py-2 px-4 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? "..." : "Remove"}
                    </button>
                  )}
                </div>

                {imageInfo && (
                  <p className="text-xs text-gray-400 mt-2">
                    Updated:{" "}
                    {new Date(imageInfo.updated_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
