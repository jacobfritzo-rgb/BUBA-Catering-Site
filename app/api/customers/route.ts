import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  await initDb();

  try {
    // Get all unique customers with their latest opt-in preferences and order info
    const result = await db.execute(`
      SELECT
        customer_email,
        customer_name,
        customer_phone,
        MAX(sms_opt_in) as sms_opt_in,
        MAX(email_opt_in) as email_opt_in,
        COUNT(*) as order_count,
        MAX(created_at) as last_order_date,
        MIN(created_at) as first_order_date
      FROM orders
      GROUP BY customer_email
      ORDER BY last_order_date DESC
    `);

    const customers = result.rows.map(row => ({
      email: row.customer_email,
      name: row.customer_name,
      phone: row.customer_phone,
      sms_opt_in: row.sms_opt_in === 1,
      email_opt_in: row.email_opt_in === 1,
      order_count: Number(row.order_count),
      last_order_date: row.last_order_date,
      first_order_date: row.first_order_date,
    }));

    return NextResponse.json(customers);

  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
