import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await initDb();
  try {
    const result = await db.execute(
      "SELECT * FROM email_templates ORDER BY trigger_name"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await initDb();
  try {
    const { trigger_name, subject, body_html, customer_subject, customer_body_html } = await request.json();
    await db.execute({
      sql: "UPDATE email_templates SET subject = ?, body_html = ?, customer_subject = ?, customer_body_html = ? WHERE trigger_name = ?",
      args: [subject, body_html, customer_subject ?? '', customer_body_html ?? '', trigger_name],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
