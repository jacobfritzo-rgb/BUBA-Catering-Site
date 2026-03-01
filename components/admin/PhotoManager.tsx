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
    description: "40 mini burekas — serves 10–15",
  },
  {
    key: "big-box",
    label: "Big Box",
    description: "8 half-size burekas — feeds 4–6",
  },
];

const EVENT_PHOTOS: ProductPhoto[] = [
  { key: "event-1", label: "Event Photo 1", description: "Party, office gathering, celebration…" },
  { key: "event-2", label: "Event Photo 2", description: "Party, office gathering, celebration…" },
  { key: "event-3", label: "Event Photo 3", description: "Party, office gathering, celebration…" },
  { key: "event-4", label: "Event Photo 4", description: "Party, office gathering, celebration…" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface UploadedImage {
  key: string;
  content_type: string;
  updated_at: string;
}

interface PhotoManagerProps {
  uploadedImages: UploadedImage[];
  onUpdate: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PhotoManager({ uploadedImages, onUpdate }: PhotoManagerProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const hasImage = (key: string) => uploadedImages.some((img) => img.key === key);

  const setCardError = (key: string, msg: string) =>
    setErrors((prev) => ({ ...prev, [key]: msg }));
  const clearCardError = (key: string) =>
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  const handleUpload = async (key: string, file: File) => {
    clearCardError(key);
    setSuccess(null);

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".heic")) {
      setCardError(key, `Unsupported format "${file.type || file.name.split(".").pop()}". Use JPG, PNG, WebP, or HEIC.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setCardError(key, `File is ${formatBytes(file.size)} — must be under 5 MB. Try compressing the image first.`);
      return;
    }

    setUploading(key);
    try {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("file", file);

      const res = await fetch("/api/product-images", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      setSuccess("Photo uploaded!");
      onUpdate();
    } catch (err: any) {
      setCardError(key, err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (key: string) => {
    clearCardError(key);
    setSuccess(null);
    setDeleting(key);
    try {
      const res = await fetch(`/api/product-images/${key}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setSuccess("Photo removed.");
      onUpdate();
    } catch (err: any) {
      setCardError(key, err.message);
    } finally {
      setDeleting(null);
    }
  };

  const renderCard = (product: ProductPhoto, compact = false) => {
    const imageExists = hasImage(product.key);
    const isUploading = uploading === product.key;
    const isDeleting = deleting === product.key;
    const imageInfo = uploadedImages.find((img) => img.key === product.key);
    const cardError = errors[product.key];

    return (
      <div
        key={product.key}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
      >
        {/* Preview */}
        <div className={`${compact ? "h-40" : "h-52"} bg-gray-100 relative`}>
          {imageExists ? (
            <img
              src={`/api/product-images/${product.key}?t=${imageInfo?.updated_at || ""}`}
              alt={product.label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium">No photo yet</p>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <div className="text-white font-semibold text-sm">Uploading…</div>
            </div>
          )}
        </div>

        {/* Info + actions */}
        <div className="p-4">
          <h3 className="font-bold text-base text-gray-900">{product.label}</h3>
          <p className="text-xs text-gray-500 mb-3">{product.description}</p>

          {cardError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded mb-3">
              {cardError}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={(el) => { fileInputRefs.current[product.key] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,.heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(product.key, file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRefs.current[product.key]?.click()}
              disabled={isUploading || isDeleting}
              className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUploading ? "Uploading…" : imageExists ? "Replace" : "Upload Photo"}
            </button>
            {imageExists && (
              <button
                onClick={() => handleDelete(product.key)}
                disabled={isUploading || isDeleting}
                className="bg-red-100 text-red-700 text-sm font-semibold py-2 px-4 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "…" : "Remove"}
              </button>
            )}
          </div>

          {imageInfo && (
            <p className="text-xs text-gray-400 mt-2">
              Updated:{" "}
              {new Date(imageInfo.updated_at).toLocaleString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Requirements banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">Photo requirements</p>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Formats:</strong> JPG, PNG, WebP, or HEIC — iPhone photos work perfectly</li>
          <li><strong>Max size:</strong> 5 MB per photo</li>
          <li><strong>Best dimensions:</strong> landscape or square, at least 800 × 600 px</li>
          <li><strong>Ideal ratio:</strong> 4:3 or 1:1 for product photos; any ratio for event gallery</li>
          <li>Avoid screenshots or heavily compressed images — use original camera photos</li>
        </ul>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* ── Product photos ──────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Product Photos</h3>
        <p className="text-sm text-gray-500 mb-4">
          Shown on the ordering page next to each box's description. Use a clean, well-lit shot of the box.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {PRODUCT_PHOTOS.map((p) => renderCard(p))}
        </div>
      </section>

      {/* ── Event gallery ───────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Event Gallery</h3>
        <p className="text-sm text-gray-500 mb-4">
          Shown in the "BUBA at Your Event" section on the ordering page. Use real event photos —
          parties, office gatherings, celebrations featuring BUBA. Fill all 4 slots for the best
          impression; empty slots show a gray placeholder.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {EVENT_PHOTOS.map((p) => renderCard(p, true))}
        </div>
      </section>
    </div>
  );
}
