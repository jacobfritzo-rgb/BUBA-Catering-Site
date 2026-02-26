import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET: Serve an image by key (public - used on the website)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  await initDb();

  try {
    const { key } = await params;
    const result = await db.execute({
      sql: "SELECT image_data, content_type FROM product_images WHERE key = ?",
      args: [key],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const imageBuffer = Buffer.from(row.image_data as string, "base64");

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": row.content_type as string,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}

// DELETE: Remove an image (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();

  try {
    const { key } = await params;
    const result = await db.execute({
      sql: "DELETE FROM product_images WHERE key = ?",
      args: [key],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
