import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// POST: Upload a product image (admin only)
export async function POST(request: NextRequest) {
  // Check auth
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
      return NextResponse.json(
        { error: "key and file are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be under 5MB" },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Upsert into database
    await db.execute({
      sql: `INSERT INTO product_images (key, image_data, content_type, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              image_data = excluded.image_data,
              content_type = excluded.content_type,
              updated_at = excluded.updated_at`,
      args: [key, base64, file.type, new Date().toISOString()],
    });

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}
