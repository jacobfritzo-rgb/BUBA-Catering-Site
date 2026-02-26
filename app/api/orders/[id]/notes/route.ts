import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: "SELECT * FROM order_notes WHERE order_id = ? ORDER BY created_at DESC",
      args: [id],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching order notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  try {
    const { id } = await params;
    const { note_type, content } = await request.json();

    if (!note_type || !content?.trim()) {
      return NextResponse.json({ error: "note_type and content are required" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "INSERT INTO order_notes (order_id, created_at, note_type, content) VALUES (?, ?, ?, ?)",
      args: [id, new Date().toISOString(), note_type, content.trim()],
    });

    return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (error) {
    console.error("Error creating order note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
