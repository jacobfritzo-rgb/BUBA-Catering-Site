import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { CreateOrderRequest, OrderStatus } from "@/lib/types";
import { sendNewOrderNotification } from "@/lib/email";

// Helper to validate order date (pickup or delivery)
function validateOrderDate(orderDate: string): string | null {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = orderDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  // Check if date is at least 72 hours from now
  const minDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  if (date < minDate) {
    return "Order date must be at least 72 hours from now";
  }

  // Note: We allow Mon/Tue orders as inquiries - operator will contact customer to confirm

  return null;
}

// Helper to calculate production deadline (order_date - 1 day)
function calculateProductionDeadline(orderDate: string): string {
  const [year, month, day] = orderDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// Helper to calculate bake deadline (order_date + window_start - 45 minutes)
function calculateBakeDeadline(orderDate: string, windowStart: string): string {
  const [year, month, day] = orderDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Parse time string (handles both "10:00 AM" and "10:00" formats)
  let hours: number;
  let minutes: number;

  if (windowStart.includes('AM') || windowStart.includes('PM')) {
    // Parse 12-hour format
    const isPM = windowStart.includes('PM');
    const timePart = windowStart.replace(/\s*(AM|PM)/i, '').trim();
    const [h, m] = timePart.split(':').map(Number);
    hours = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
    minutes = m || 0;
  } else {
    // Parse 24-hour format
    const [h, m] = windowStart.split(':').map(Number);
    hours = h;
    minutes = m || 0;
  }

  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() - 45);
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  await initDb();

  try {
    const body: CreateOrderRequest = await request.json();

    // Validate required fields
    if (!body.customer_name || !body.customer_email || !body.customer_phone) {
      return NextResponse.json(
        { error: "customer_name, customer_email, and customer_phone are required" },
        { status: 400 }
      );
    }

    if (!body.fulfillment_type || (body.fulfillment_type !== "pickup" && body.fulfillment_type !== "delivery")) {
      return NextResponse.json(
        { error: "fulfillment_type must be 'pickup' or 'delivery'" },
        { status: 400 }
      );
    }

    // Validate delivery address if delivery is selected
    if (body.fulfillment_type === "delivery" && !body.delivery_address) {
      return NextResponse.json(
        { error: "delivery_address is required for delivery orders" },
        { status: 400 }
      );
    }

    // Validate order date (pickup or delivery)
    const orderDate = body.fulfillment_type === "pickup" ? body.pickup_date : body.delivery_date;
    if (!orderDate) {
      return NextResponse.json(
        { error: body.fulfillment_type === "pickup" ? "pickup_date is required" : "delivery_date is required" },
        { status: 400 }
      );
    }

    const dateError = validateOrderDate(orderDate);
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    // Validate order has at least one item
    if (!body.order_data.items || body.order_data.items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one box" },
        { status: 400 }
      );
    }

    // Get available flavors
    const flavorsResult = await db.execute("SELECT name FROM flavors");
    const availableFlavors = new Set(flavorsResult.rows.map(row => row.name as string));

    // Validate each item
    for (const item of body.order_data.items) {
      // Party Box: 1-3 flavors, Big Box: 1-4 flavors
      const maxFlavors = item.type === "party_box" ? 3 : 4;
      if (item.flavors.length < 1 || item.flavors.length > maxFlavors) {
        return NextResponse.json(
          { error: `${item.type === "party_box" ? "Party Box" : "Big Box"} must have 1-${maxFlavors} flavors selected` },
          { status: 400 }
        );
      }

      // Validate total pieces match expected count for the box type
      const expectedPieces = item.type === "party_box" ? 40 : 8;
      const totalQuantity = item.flavors.reduce((sum, f) => sum + f.quantity, 0);

      if (totalQuantity !== expectedPieces) {
        return NextResponse.json(
          { error: `${item.type === "party_box" ? "Party Box" : "Big Box"} must have exactly ${expectedPieces} pieces total` },
          { status: 400 }
        );
      }

      // Validate all flavors exist
      for (const flavor of item.flavors) {
        if (!availableFlavors.has(flavor.name)) {
          return NextResponse.json(
            { error: `Flavor "${flavor.name}" does not exist` },
            { status: 400 }
          );
        }
      }
    }

    // Calculate total price
    let totalPrice = 0;
    for (const item of body.order_data.items) {
      totalPrice += item.price_cents * item.quantity;
    }
    if (body.order_data.addons) {
      for (const addon of body.order_data.addons) {
        totalPrice += addon.price_cents * addon.quantity;
      }
    }
    // Add delivery fee if applicable
    if (body.fulfillment_type === "delivery") {
      totalPrice += body.delivery_fee || 0;
    }

    // Calculate deadlines
    const windowStart = body.fulfillment_type === "pickup" ? body.pickup_time! : body.delivery_window_start!;
    const productionDeadline = calculateProductionDeadline(orderDate);
    const bakeDeadline = calculateBakeDeadline(orderDate, windowStart);

    // Insert order
    const result = await db.execute({
      sql: `
        INSERT INTO orders (
          status, created_at, customer_name, customer_email, customer_phone,
          fulfillment_type, pickup_date, pickup_time,
          delivery_date, delivery_window_start, delivery_window_end,
          delivery_address, delivery_notes, delivery_fee, sms_opt_in, email_opt_in,
          order_data, production_deadline, bake_deadline, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        "pending",
        new Date().toISOString(),
        body.customer_name,
        body.customer_email,
        body.customer_phone,
        body.fulfillment_type,
        body.pickup_date || null,
        body.pickup_time || null,
        body.delivery_date || null,
        body.delivery_window_start || null,
        body.delivery_window_end || null,
        body.delivery_address || null,
        body.delivery_notes || null,
        body.fulfillment_type === "delivery" ? (body.delivery_fee || 0) : 0,
        body.sms_opt_in ? 1 : 0,
        body.email_opt_in ? 1 : 0,
        JSON.stringify(body.order_data),
        productionDeadline,
        bakeDeadline,
        totalPrice,
      ],
    });

    const orderId = Number(result.lastInsertRowid);

    // Fetch the created order to send email
    const createdOrder = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [orderId],
    });

    if (createdOrder.rows.length > 0) {
      const orderWithData = {
        ...createdOrder.rows[0],
        order_data: JSON.parse(createdOrder.rows[0].order_data as string),
      };
      // Send notification email (don't await - let it happen in background)
      sendNewOrderNotification(orderWithData as any).catch(err =>
        console.error('Email notification failed:', err)
      );
    }

    return NextResponse.json({
      id: orderId,
      status: "pending",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating order:", error);
    // Return more detailed error info
    const errorMessage = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await initDb();
  try {
    await db.execute("DELETE FROM orders");
    await db.execute("DELETE FROM order_notes");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting orders:", error);
    return NextResponse.json({ error: "Failed to delete orders" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  await initDb();

  try {
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get("status") as OrderStatus | null;

    let query = "SELECT * FROM orders";
    const args: string[] = [];

    if (statusFilter) {
      query += " WHERE status = ?";
      args.push(statusFilter);
    }

    query += " ORDER BY created_at DESC";

    const result = await db.execute({
      sql: query,
      args,
    });

    // Parse order_data for each order
    const orders = result.rows.map(row => ({
      ...row,
      order_data: JSON.parse(row.order_data as string),
    }));

    return NextResponse.json(orders);

  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
