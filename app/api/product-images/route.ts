import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// POST: Upload and auto-compress a product image (admin only)
// Accepts any image format including HEIC up to 50 MB.
// Converts to JPEG and compresses automatically before storing.
export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();

  try {
    const formData = await request.formData();
    const key = formData.get("key") as string;
    const file = formData.get("file") as File;

    if (!key || !file) {
      return NextResponse.json({ error: "key and file are required" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic");
    if (!isImage) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // 50 MB raw limit — sharp will compress it down before storage
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 50 MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compress with sharp: auto-rotate (fixes EXIF orientation), resize to max 2000px,
    // convert to JPEG. If still over 1.2 MB, do a second pass at lower quality.
    let compressed: Buffer;
    let outputType = "image/jpeg";

    try {
      const sharp = (await import("sharp")).default;

      compressed = await sharp(buffer)
        .rotate()                                                      // respect EXIF rotation
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      // Second pass if still over 1.2 MB — drop to 1400px max and lower quality
      if (compressed.length > 1.2 * 1024 * 1024) {
        compressed = await sharp(buffer)
          .rotate()
          .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
      }
    } catch (err) {
      // Sharp unavailable — fall back to storing original (must be under 5 MB)
      console.error("sharp compression unavailable, storing original:", err);
      if (buffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Auto-compression unavailable. Try a file under 5 MB, or convert HEIC to JPEG first." },
          { status: 400 }
        );
      }
      compressed = buffer;
      outputType = file.type || "image/jpeg";
    }

    const base64 = compressed.toString("base64");

    await db.execute({
      sql: `INSERT INTO product_images (key, image_data, content_type, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              image_data = excluded.image_data,
              content_type = excluded.content_type,
              updated_at = excluded.updated_at`,
      args: [key, base64, outputType, new Date().toISOString()],
    });

    return NextResponse.json({
      success: true,
      key,
      size_kb: Math.round(compressed.length / 1024),
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

// GET: List all product image keys (for admin)
export async function GET() {
  await initDb();

  try {
    const result = await db.execute(
      "SELECT key, content_type, updated_at FROM product_images ORDER BY key"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error listing images:", error);
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }
}
