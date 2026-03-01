import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { OrderStatus, UpdateOrderRequest } from "@/lib/types";
import { sendNotification, generateProductionSheetHTML } from "@/lib/email";
import { requireAdmin } from "@/lib/api-auth";

function calculateProductionDeadline(orderDate: string): string {
  const [year, month, day] = orderDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function calculateBakeDeadline(orderDate: string, windowStart: string, offsetMinutes: number): string {
  const [year, month, day] = orderDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  let hours: number, minutes: number;
  if (windowStart.includes('AM') || windowStart.includes('PM')) {
    const isPM = windowStart.includes('PM');
    const timePart = windowStart.replace(/\s*(AM|PM)/i, '').trim();
    const [h, m] = timePart.split(':').map(Number);
    hours = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
    minutes = m || 0;
  } else {
    const [h, m] = windowStart.split(':').map(Number);
    hours = h;
    minutes = m || 0;
  }
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() - offsetMinutes);
  return date.toISOString();
}

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

    // ── Full-order edit branch ─────────────────────────────────────────────
    // Triggered when body contains customer_name, fulfillment_type, or order_data
    if (body.customer_name !== undefined || body.fulfillment_type !== undefined || body.order_data !== undefined) {
      if (currentStatus === "paid" || currentStatus === "completed") {
        return NextResponse.json(
          { error: "Cannot edit a paid or completed order" },
          { status: 400 }
        );
      }

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
      if (body.fulfillment_type === "delivery" && !body.delivery_address) {
        return NextResponse.json(
          { error: "delivery_address is required for delivery orders" },
          { status: 400 }
        );
      }

      const orderDate = body.fulfillment_type === "pickup" ? body.pickup_date : body.delivery_date;
      if (!orderDate) {
        return NextResponse.json(
          { error: body.fulfillment_type === "pickup" ? "pickup_date is required" : "delivery_date is required" },
          { status: 400 }
        );
      }

      if (!body.order_data?.items || body.order_data.items.length === 0) {
        return NextResponse.json(
          { error: "Order must contain at least one box" },
          { status: 400 }
        );
      }

      // Validate items + flavors
      const flavorsResult = await db.execute("SELECT name FROM flavors");
      const availableFlavors = new Set(flavorsResult.rows.map(row => row.name as string));

      for (const item of body.order_data.items) {
        const maxFlavors = item.type === "party_box" ? 3 : 4;
        if (item.flavors.length < 1 || item.flavors.length > maxFlavors) {
          return NextResponse.json(
            { error: `${item.type === "party_box" ? "Party Box" : "Big Box"} must have 1-${maxFlavors} flavors selected` },
            { status: 400 }
          );
        }
        const expectedPieces = item.type === "party_box" ? 40 : 8;
        const totalQuantity = item.flavors.reduce((sum: number, f: { quantity: number }) => sum + f.quantity, 0);
        if (totalQuantity !== expectedPieces) {
          return NextResponse.json(
            { error: `${item.type === "party_box" ? "Party Box" : "Big Box"} must have exactly ${expectedPieces} pieces total` },
            { status: 400 }
          );
        }
        for (const flavor of item.flavors) {
          if (!availableFlavors.has(flavor.name)) {
            return NextResponse.json(
              { error: `Flavor "${flavor.name}" does not exist` },
              { status: 400 }
            );
          }
        }
      }

      // Fetch current order for delivery_fee (carry it over)
      const fullOrderResult = await db.execute({
        sql: "SELECT delivery_fee FROM orders WHERE id = ?",
        args: [id],
      });
      const currentDeliveryFee = Number(fullOrderResult.rows[0].delivery_fee) || 0;

      // Recalculate total_price
      let totalPrice = 0;
      for (const item of body.order_data.items) {
        totalPrice += item.price_cents * item.quantity;
      }
      if (body.order_data.addons) {
        for (const addon of body.order_data.addons) {
          totalPrice += addon.price_cents * addon.quantity;
        }
      }
      if (body.fulfillment_type === "delivery") {
        totalPrice += currentDeliveryFee;
      }

      // Recalculate deadlines
      const windowStart = body.fulfillment_type === "pickup" ? body.pickup_time! : body.delivery_window_start!;
      const productionDeadline = calculateProductionDeadline(orderDate);
      const bakeOffsetMinutes = body.fulfillment_type === "delivery" ? 90 : 45;
      const bakeDeadline = calculateBakeDeadline(orderDate, windowStart, bakeOffsetMinutes);

      // Compute delivery window end (windowStart + 30 min)
      let deliveryWindowEnd = body.delivery_window_end || null;
      if (body.fulfillment_type === "delivery" && body.delivery_window_start && !body.delivery_window_end) {
        const [h, m] = body.delivery_window_start.split(":").map(Number);
        const endM = m + 30;
        const endH = endM >= 60 ? h + 1 : h;
        deliveryWindowEnd = `${endH.toString().padStart(2, "0")}:${(endM % 60).toString().padStart(2, "0")}`;
      }

      await db.execute({
        sql: `UPDATE orders SET
          customer_name = ?, customer_email = ?, customer_phone = ?,
          fulfillment_type = ?,
          pickup_date = ?, pickup_time = ?,
          delivery_date = ?, delivery_window_start = ?, delivery_window_end = ?,
          delivery_address = ?, delivery_notes = ?,
          order_data = ?, total_price = ?,
          production_deadline = ?, bake_deadline = ?
          WHERE id = ?`,
        args: [
          body.customer_name,
          body.customer_email,
          body.customer_phone,
          body.fulfillment_type,
          body.fulfillment_type === "pickup" ? (body.pickup_date || null) : null,
          body.fulfillment_type === "pickup" ? (body.pickup_time || null) : null,
          body.fulfillment_type === "delivery" ? (body.delivery_date || null) : null,
          body.fulfillment_type === "delivery" ? (body.delivery_window_start || null) : null,
          body.fulfillment_type === "delivery" ? deliveryWindowEnd : null,
          body.fulfillment_type === "delivery" ? (body.delivery_address || null) : null,
          body.delivery_notes || null,
          JSON.stringify(body.order_data),
          totalPrice,
          productionDeadline,
          bakeDeadline,
          id,
        ],
      });

      const editedResult = await db.execute({
        sql: "SELECT * FROM orders WHERE id = ?",
        args: [id],
      });
      const editedOrder = {
        ...editedResult.rows[0],
        order_data: JSON.parse(editedResult.rows[0].order_data as string),
      };
      return NextResponse.json(editedOrder);
    }
    // ── End full-order edit branch ─────────────────────────────────────────

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
    if (body.metrospeedy_pickup_time !== undefined) {
      extraUpdates.push("metrospeedy_pickup_time = ?");
      extraArgs.push(body.metrospeedy_pickup_time || null);
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
