import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { OrderStatus, UpdateOrderRequest } from "@/lib/types";
import { sendOrderPaidNotification, generateProductionSheetHTML } from "@/lib/email";

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["paid"],
  rejected: [],
  paid: ["completed"],
  completed: [],
};

function isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();

  try {
    const { id } = await params;

    const result = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = {
      ...result.rows[0],
      order_data: JSON.parse(result.rows[0].order_data as string),
    };

    return NextResponse.json(order);

  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();

  try {
    const { id } = await params;
    const body: UpdateOrderRequest = await request.json();

    // Get current order
    const result = await db.execute({
      sql: "SELECT status FROM orders WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const currentStatus = result.rows[0].status as OrderStatus;

    // Handle status update
    if (body.status) {
      if (!isValidTransition(currentStatus, body.status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentStatus} to ${body.status}` },
          { status: 400 }
        );
      }

      await db.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [body.status, id],
      });

      // If order just became paid, send kitchen notification
      if (body.status === 'paid') {
        // Fetch all paid orders for production sheet
        const paidOrders = await db.execute({
          sql: "SELECT * FROM orders WHERE status = 'paid' ORDER BY CASE WHEN fulfillment_type = 'delivery' THEN delivery_date ELSE pickup_date END",
          args: [],
        });

        const ordersWithData = paidOrders.rows.map(row => ({
          ...row,
          order_data: JSON.parse(row.order_data as string),
        }));

        const productionHTML = generateProductionSheetHTML(ordersWithData as any[]);

        // Get this specific order for the email
        const thisOrderResult = await db.execute({
          sql: "SELECT * FROM orders WHERE id = ?",
          args: [id],
        });

        if (thisOrderResult.rows.length > 0) {
          const thisOrder = {
            ...thisOrderResult.rows[0],
            order_data: JSON.parse(thisOrderResult.rows[0].order_data as string),
          };

          // Send notification (don't await - background)
          sendOrderPaidNotification(thisOrder as any, productionHTML).catch(err =>
            console.error('Kitchen notification failed:', err)
          );
        }
      }
    }

    // Handle kitchen_notified update
    if (body.kitchen_notified !== undefined) {
      await db.execute({
        sql: "UPDATE orders SET kitchen_notified = ? WHERE id = ?",
        args: [body.kitchen_notified, id],
      });
    }

    // Fetch and return updated order
    const updatedResult = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [id],
    });

    const updatedOrder = {
      ...updatedResult.rows[0],
      order_data: JSON.parse(updatedResult.rows[0].order_data as string),
    };

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
