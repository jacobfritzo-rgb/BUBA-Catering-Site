import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { sendNotification } from "@/lib/email";
import { Order } from "@/lib/types";

// Sample order for test emails
function makeSampleOrder(): Order {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 4);
  const dateStr = tomorrow.toISOString().split("T")[0];

  return {
    id: 999,
    status: "pending",
    created_at: new Date().toISOString(),
    customer_name: "Sample Customer",
    customer_email: "customer@example.com",
    customer_phone: "(212) 555-1234",
    fulfillment_type: "pickup",
    pickup_date: dateStr,
    pickup_time: "14:00",
    delivery_fee: 0,
    delivery_notes: null,
    sms_opt_in: 0,
    email_opt_in: 0,
    production_deadline: dateStr,
    bake_deadline: new Date().toISOString(),
    total_price: 30300,
    kitchen_notified: 0,
    order_data: {
      items: [
        {
          type: "party_box",
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: "Cheese", quantity: 20 },
            { name: "Spinach Artichoke", quantity: 20 },
          ],
        },
        {
          type: "big_box",
          quantity: 1,
          price_cents: 7800,
          flavors: [{ name: "Potato Leek", quantity: 8 }],
        },
      ],
      addons: [{ name: "Extra Spicy Schug", quantity: 2, price_cents: 800 }],
    },
  };
}

export async function POST(request: NextRequest) {
  await initDb();

  try {
    const { to, trigger_name } = await request.json();

    if (!to || !trigger_name) {
      return NextResponse.json({ error: "to and trigger_name are required" }, { status: 400 });
    }

    const sampleOrder = makeSampleOrder();

    // Temporarily override the recipients by patching the notification
    // We do this by directly calling the email function with the test address
    const { db } = await import("@/lib/db");
    const { Resend } = await import("resend");

    const templateResult = await db.execute({
      sql: "SELECT * FROM email_templates WHERE trigger_name = ?",
      args: [trigger_name],
    });

    if (templateResult.rows.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const template = templateResult.rows[0];

    // Build variables for the sample order
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://buba-catering-site-production.up.railway.app";
    const vars: Record<string, string> = {
      order_id: "999",
      customer_name: "Sample Customer",
      customer_email: "customer@example.com",
      customer_phone: "(212) 555-1234",
      fulfillment_type: "Pickup",
      fulfillment_date: sampleOrder.pickup_date || "",
      fulfillment_time: "2:00 PM",
      delivery_address_line: "",
      total: "$303.00",
      items_html: "<p><strong>Party Box</strong></p><ul><li>Cheese: 20 pcs</li><li>Spinach Artichoke: 20 pcs</li></ul><p><strong>Big Box</strong></p><ul><li>Potato Leek: 8 pcs</li></ul>",
      admin_url: `${baseUrl}/admin`,
      production_sheet: "<p><em>[Production sheet would appear here for paid orders]</em></p>",
    };

    const substitute = (tmpl: string) =>
      tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

    const subject = `[TEST] ${substitute(template.subject as string)}`;
    const html = substitute(template.body_html as string);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "BUBA Catering <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Test email error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send test email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
