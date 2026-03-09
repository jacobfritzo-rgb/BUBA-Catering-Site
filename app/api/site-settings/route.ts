import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  await initDb();
  try {
    const result = await db.execute("SELECT key, value FROM site_settings");
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key as string] = row.value as string;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await initDb();
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    await db.execute({
      sql: "INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)",
      args: [key, value],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating site setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
