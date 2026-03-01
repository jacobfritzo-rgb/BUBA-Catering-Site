import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await initDb();

  try {
    const body = await request.json();
    const { phone_numbers, notes } = body;

    if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return NextResponse.json(
        { error: "phone_numbers array is required" },
        { status: 400 }
      );
    }

    // Store the export record
    const result = await db.execute({
      sql: `
        INSERT INTO preorder_exports (exported_at, phone_numbers, customer_count, notes)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        new Date().toISOString(),
        JSON.stringify(phone_numbers),
        phone_numbers.length,
        notes || null,
      ],
    });

    return NextResponse.json({
      id: Number(result.lastInsertRowid),
      exported_at: new Date().toISOString(),
      customer_count: phone_numbers.length,
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating export record:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create export record";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  await initDb();

  try {
    const result = await db.execute(`
      SELECT * FROM preorder_exports
      ORDER BY exported_at DESC
    `);

    const exports = result.rows.map(row => ({
      id: Number(row.id),
      exported_at: row.exported_at,
      phone_numbers: JSON.parse(row.phone_numbers as string),
      customer_count: Number(row.customer_count),
      notes: row.notes,
    }));

    return NextResponse.json(exports);

  } catch (error) {
    console.error("Error fetching exports:", error);
    return NextResponse.json(
      { error: "Failed to fetch exports" },
      { status: 500 }
    );
  }
}
