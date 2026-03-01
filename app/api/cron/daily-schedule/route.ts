import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import {
  sendScheduledNotification,
  generateFOHScheduleHTML,
  generateKitchenAlertHTML,
} from "@/lib/email";

// Called by Railway cron (or any HTTP client) on a schedule.
// Secure with CRON_SECRET env var — set the same value in Railway's cron config
// as the x-cron-secret header value.
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // --- FOH DAILY SCHEDULE ---
  // All non-rejected orders with fulfillment tomorrow
  const tomorrowResult = await db.execute({
    sql: `SELECT * FROM orders
          WHERE status NOT IN ('rejected')
            AND (
              (fulfillment_type = 'delivery' AND delivery_date = ?)
              OR (fulfillment_type = 'pickup' AND pickup_date = ?)
            )
          ORDER BY COALESCE(delivery_window_start, pickup_time)`,
    args: [tomorrowStr, tomorrowStr],
  });

  const tomorrowOrders = tomorrowResult.rows.map((row) => ({
    ...row,
    order_data: JSON.parse(row.order_data as string),
  }));

  const fohSubject = `Tomorrow's BUBA Catering Schedule — ${tomorrow.toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  )}`;
  const fohHtml = generateFOHScheduleHTML(tomorrowOrders as any[], tomorrow);

  await sendScheduledNotification("daily_schedule_foh", fohSubject, fohHtml);

  // --- KITCHEN PRODUCTION ALERT ---
  // Paid/approved orders with fulfillment in 48 hours (day-after-tomorrow)
  const in48h = new Date();
  in48h.setDate(in48h.getDate() + 2);
  const in48hStr = in48h.toISOString().split("T")[0];

  const kitchenResult = await db.execute({
    sql: `SELECT * FROM orders
          WHERE status IN ('paid', 'approved')
            AND (
              (fulfillment_type = 'delivery' AND delivery_date = ?)
              OR (fulfillment_type = 'pickup' AND pickup_date = ?)
            )`,
    args: [in48hStr, in48hStr],
  });

  const kitchenOrders = kitchenResult.rows.map((row) => ({
    ...row,
    order_data: JSON.parse(row.order_data as string),
  }));

  if (kitchenOrders.length > 0) {
    const kitchenSubject = `Production Needed — ${in48h.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}`;
    const kitchenHtml = generateKitchenAlertHTML(kitchenOrders as any[], in48h);
    await sendScheduledNotification(
      "production_alert_kitchen",
      kitchenSubject,
      kitchenHtml
    );
  }

  return NextResponse.json({
    success: true,
    foh_orders: tomorrowOrders.length,
    kitchen_orders: kitchenOrders.length,
    foh_date: tomorrowStr,
    kitchen_date: in48hStr,
  });
}
