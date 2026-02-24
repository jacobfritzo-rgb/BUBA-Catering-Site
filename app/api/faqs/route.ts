import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET() {
  try {
    const result = await turso.execute(
      "SELECT * FROM faqs ORDER BY display_order ASC"
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { question, answer } = await request.json();

    // Get the next display order
    const maxOrder = await turso.execute(
      "SELECT COALESCE(MAX(display_order), 0) as max_order FROM faqs"
    );
    const nextOrder = Number(maxOrder.rows[0].max_order) + 1;

    const result = await turso.execute({
      sql: "INSERT INTO faqs (question, answer, display_order) VALUES (?, ?, ?) RETURNING *",
      args: [question, answer, nextOrder],
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, question, answer, display_order } = await request.json();

    const result = await turso.execute({
      sql: "UPDATE faqs SET question = ?, answer = ?, display_order = ? WHERE id = ? RETURNING *",
      args: [question, answer, display_order, id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    await turso.execute({
      sql: "DELETE FROM faqs WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
