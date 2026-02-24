import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET() {
  await initDb();

  try {
    const result = await db.execute(
      "SELECT * FROM menu_items WHERE available = 1 ORDER BY category ASC, sort_order ASC"
    );

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await initDb();

  try {
    const body = await request.json();

    if (!body.name || !body.category || body.price_cents === undefined) {
      return NextResponse.json(
        { error: "name, category, and price_cents are required" },
        { status: 400 }
      );
    }

    // Get next sort_order for this category
    const maxResult = await db.execute({
      sql: "SELECT MAX(sort_order) as max_order FROM menu_items WHERE category = ?",
      args: [body.category],
    });
    const nextSortOrder = ((maxResult.rows[0]?.max_order as number) || 0) + 1;

    // Insert menu item
    const result = await db.execute({
      sql: "INSERT INTO menu_items (name, description, price_cents, category, sort_order) VALUES (?, ?, ?, ?, ?)",
      args: [body.name, body.description || null, body.price_cents, body.category, nextSortOrder],
    });

    // Return the inserted item
    const insertedItem = await db.execute({
      sql: "SELECT * FROM menu_items WHERE id = ?",
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(insertedItem.rows[0], { status: 201 });

  } catch (error: any) {
    console.error("Error creating menu item:", error);

    // Check for unique constraint violation
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Menu item with this name already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await initDb();

  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    // Delete the item
    const result = await db.execute({
      sql: "DELETE FROM menu_items WHERE id = ?",
      args: [body.id],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    );
  }
}
