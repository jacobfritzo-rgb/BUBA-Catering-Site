import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { OrderStatus, UpdateOrderRequest } from "@/lib/types";
import { sendNotification, generateProductionSheetHTML } from "@/lib/email";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

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
  const authError = await requireAdmin(request);
  if (authError) return authError;

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

    // Build dynamic update for extra fields (rejection_reason, metrospeedy, etc.)
    const extraUpdates: string[] = [];
    const extraArgs: (string | number | null)[] = [];
    if (body.rejection_reason !== undefined) {
      extraUpdates.push("rejection_reason = ?");
      extraArgs.push(body.rejection_reason);
    }
    if (body.metrospeedy_status !== undefined) {
      extraUpdates.push("metrospeedy_status = ?");
      extraArgs.push(body.metrospeedy_status);
    }
    if (body.metrospeedy_notes !== undefined) {
      extraUpdates.push("metrospeedy_notes = ?");
      extraArgs.push(body.metrospeedy_notes);
    }
    if (body.production_done !== undefined) {
      extraUpdates.push("production_done = ?");
      extraArgs.push(body.production_done);
      extraUpdates.push("production_done_at = ?");
      extraArgs.push(body.production_done === 1 ? new Date().toISOString() : null);
    }
    if (extraUpdates.length > 0) {
      await db.execute({
        sql: `UPDATE orders SET ${extraUpdates.join(', ')} WHERE id = ?`,
        args: [...extraArgs, id],
      });
    }

    // Handle delivery_fee update — recalculates total_price atomically
    if (body.delivery_fee !== undefined) {
      // Subtract old fee, add new fee (safe even if called multiple times)
      await db.execute({
        sql: "UPDATE orders SET delivery_fee = ?, total_price = total_price - delivery_fee + ? WHERE id = ?",
        args: [body.delivery_fee, body.delivery_fee, id],
      });
      const feeOrderResult = await db.execute({
        sql: "SELECT * FROM orders WHERE id = ?",
        args: [id],
      });
      if (feeOrderResult.rows.length > 0) {
        const feeOrder = {
          ...feeOrderResult.rows[0],
          order_data: JSON.parse(feeOrderResult.rows[0].order_data as string),
        };
        sendNotification('delivery_fee_confirmed', feeOrder as any).catch(err =>
          console.error('delivery_fee_confirmed notification failed:', err)
        );
      }
    }

    // Handle status update — admin can set any status (no restrictions)
    if (body.status && body.status !== currentStatus) {
      await db.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [body.status, id],
      });

      // Fetch full updated order for email notification (includes rejection_reason just written)
      const orderResult = await db.execute({
        sql: "SELECT * FROM orders WHERE id = ?",
        args: [id],
      });
      const order = {
        ...orderResult.rows[0],
        order_data: JSON.parse(orderResult.rows[0].order_data as string),
      };

      // Map status to notification trigger name
      const triggerMap: Partial<Record<OrderStatus, string>> = {
        approved: 'order_approved',
        rejected: 'order_rejected',
        paid: 'order_paid',
        completed: 'order_completed',
      };

      const trigger = triggerMap[body.status];
      if (trigger) {
        let productionSheetHTML: string | undefined;
        if (body.status === 'paid') {
          const paidOrders = await db.execute({
            sql: "SELECT * FROM orders WHERE status = 'paid' ORDER BY CASE WHEN fulfillment_type = 'delivery' THEN delivery_date ELSE pickup_date END",
            args: [],
          });
          const ordersWithData = paidOrders.rows.map(row => ({
            ...row,
            order_data: JSON.parse(row.order_data as string),
          }));
          productionSheetHTML = generateProductionSheetHTML(ordersWithData as any[]);
        }

        sendNotification(trigger, order as any, productionSheetHTML).catch(err =>
          console.error(`Notification failed for ${trigger}:`, err)
        );
      }
    }

    // Handle production_done notification
    if (body.production_done === 1) {
      const orderResult = await db.execute({
        sql: "SELECT * FROM orders WHERE id = ?",
        args: [id],
      });
      if (orderResult.rows.length > 0) {
        const order = {
          ...orderResult.rows[0],
          order_data: JSON.parse(orderResult.rows[0].order_data as string),
        };
        sendNotification('production_done', order as any).catch(err =>
          console.error('production_done notification failed:', err)
        );
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
