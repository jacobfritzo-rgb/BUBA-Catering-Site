import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { CreateFlavorRequest, DeleteFlavorRequest } from "@/lib/types";

export async function GET() {
  await initDb();

  try {
    const result = await db.execute(
      "SELECT * FROM flavors ORDER BY sort_order ASC"
    );

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error("Error fetching flavors:", error);
    return NextResponse.json(
      { error: "Failed to fetch flavors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await initDb();

  try {
    const body: CreateFlavorRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Get next sort_order
    const maxResult = await db.execute(
      "SELECT MAX(sort_order) as max_order FROM flavors"
    );
    const nextSortOrder = ((maxResult.rows[0]?.max_order as number) || 0) + 1;

    // Insert flavor
    const result = await db.execute({
      sql: "INSERT INTO flavors (name, description, sort_order) VALUES (?, ?, ?)",
      args: [body.name, body.description || null, nextSortOrder],
    });

    // Return the inserted flavor
    const insertedFlavor = await db.execute({
      sql: "SELECT * FROM flavors WHERE id = ?",
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(insertedFlavor.rows[0], { status: 201 });

  } catch (error: any) {
    console.error("Error creating flavor:", error);

    // Check for unique constraint violation
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Flavor with this name already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create flavor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  await initDb();

  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Toggle the available status
    const result = await db.execute({
      sql: "UPDATE flavors SET available = CASE WHEN available = 1 THEN 0 ELSE 1 END WHERE name = ?",
      args: [body.name],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { error: "Flavor not found" },
        { status: 404 }
      );
    }

    // Return the updated flavor
    const updatedFlavor = await db.execute({
      sql: "SELECT * FROM flavors WHERE name = ?",
      args: [body.name],
    });

    return NextResponse.json(updatedFlavor.rows[0]);

  } catch (error) {
    console.error("Error updating flavor:", error);
    return NextResponse.json(
      { error: "Failed to update flavor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  await initDb();

  try {
    const body: DeleteFlavorRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Check if flavor is referenced in any non-completed orders
    const ordersResult = await db.execute(
      "SELECT id, order_data FROM orders WHERE status != 'completed'"
    );

    for (const row of ordersResult.rows) {
      const orderData = JSON.parse(row.order_data as string);
      for (const item of orderData.items) {
        for (const flavor of item.flavors) {
          if (flavor.name === body.name) {
            return NextResponse.json(
              { error: "Cannot delete flavor that is referenced in non-completed orders" },
              { status: 400 }
            );
          }
        }
      }
    }

    // Delete the flavor
    const result = await db.execute({
      sql: "DELETE FROM flavors WHERE name = ?",
      args: [body.name],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { error: "Flavor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting flavor:", error);
    return NextResponse.json(
      { error: "Failed to delete flavor" },
      { status: 500 }
    );
  }
}
