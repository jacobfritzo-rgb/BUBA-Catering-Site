import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  await initDb();
  try {
    const result = await db.execute(
      "SELECT * FROM email_settings ORDER BY trigger_name"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  await initDb();
  try {
    const settings = await request.json();
    for (const s of settings) {
      await db.execute({
        sql: "UPDATE email_settings SET enabled = ?, recipients = ? WHERE trigger_name = ?",
        args: [s.enabled ? 1 : 0, s.recipients, s.trigger_name],
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating email settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
