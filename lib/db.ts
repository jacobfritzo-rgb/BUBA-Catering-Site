import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local");
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;

  try {
    // Create orders table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
        pickup_date TEXT,
        pickup_time TEXT,
        delivery_date TEXT,
        delivery_window_start TEXT,
        delivery_window_end TEXT,
        delivery_address TEXT,
        delivery_notes TEXT,
        delivery_fee INTEGER NOT NULL DEFAULT 0,
        sms_opt_in INTEGER NOT NULL DEFAULT 0,
        email_opt_in INTEGER NOT NULL DEFAULT 0,
        order_data TEXT NOT NULL,
        production_deadline TEXT NOT NULL,
        bake_deadline TEXT NOT NULL,
        total_price INTEGER NOT NULL,
        kitchen_notified INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create flavors table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flavors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        available INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create preorder_exports table to track when phone numbers are sent
    await db.execute(`
      CREATE TABLE IF NOT EXISTS preorder_exports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exported_at TEXT NOT NULL,
        phone_numbers TEXT NOT NULL,
        customer_count INTEGER NOT NULL,
        notes TEXT
      )
    `);

    // Create menu_items table for add-ons and other items
    await db.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        price_cents INTEGER NOT NULL,
        category TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create email_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_settings (
        trigger_name TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        recipients TEXT NOT NULL DEFAULT ''
      )
    `);

    // Create email_templates table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_templates (
        trigger_name TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL
      )
    `);

    // Seed email_settings if empty
    const settingsResult = await db.execute("SELECT COUNT(*) as count FROM email_settings");
    if ((settingsResult.rows[0].count as number) === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || '';
      const kitchenEmail = process.env.KITCHEN_EMAIL || '';
      const triggers = [
        { trigger_name: 'new_order', enabled: 1, recipients: adminEmail },
        { trigger_name: 'order_approved', enabled: 1, recipients: adminEmail },
        { trigger_name: 'order_rejected', enabled: 1, recipients: adminEmail },
        { trigger_name: 'order_paid', enabled: 1, recipients: kitchenEmail },
        { trigger_name: 'order_completed', enabled: 0, recipients: adminEmail },
      ];
      for (const t of triggers) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO email_settings (trigger_name, enabled, recipients) VALUES (?, ?, ?)",
          args: [t.trigger_name, t.enabled, t.recipients],
        });
      }
    }

    // Seed email_templates if empty
    const templatesResult = await db.execute("SELECT COUNT(*) as count FROM email_templates");
    if ((templatesResult.rows[0].count as number) === 0) {
      const adminUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://buba-catering-site-production.up.railway.app';
      const defaultTemplates = [
        {
          trigger_name: 'new_order',
          label: 'New Order Submitted',
          subject: 'New Catering Request #{{order_id}} — {{customer_name}}',
          body_html: `<h2>New Catering Order Request</h2>\n<p><strong>Order ID:</strong> #{{order_id}}</p>\n<p><strong>Customer:</strong> {{customer_name}}</p>\n<p><strong>Email:</strong> {{customer_email}}</p>\n<p><strong>Phone:</strong> {{customer_phone}}</p>\n<p><strong>Type:</strong> {{fulfillment_type}}</p>\n<p><strong>Date:</strong> {{fulfillment_date}}</p>\n<p><strong>Time:</strong> {{fulfillment_time}}</p>\n{{delivery_address_line}}\n<p><strong>Total:</strong> {{total}}</p>\n{{items_html}}\n<p><a href="${adminUrl}/admin">View in Admin Dashboard</a></p>`,
        },
        {
          trigger_name: 'order_approved',
          label: 'Order Approved',
          subject: 'Order #{{order_id}} Approved — {{customer_name}}',
          body_html: `<h2>Order Approved</h2>\n<p>Order <strong>#{{order_id}}</strong> for <strong>{{customer_name}}</strong> has been approved.</p>\n<p><strong>Fulfillment:</strong> {{fulfillment_type}} on {{fulfillment_date}} at {{fulfillment_time}}</p>\n<p><strong>Total:</strong> {{total}}</p>\n<p><a href="${adminUrl}/admin">View in Admin Dashboard</a></p>`,
        },
        {
          trigger_name: 'order_rejected',
          label: 'Order Rejected',
          subject: 'Order #{{order_id}} Rejected — {{customer_name}}',
          body_html: `<h2>Order Rejected</h2>\n<p>Order <strong>#{{order_id}}</strong> for <strong>{{customer_name}}</strong> has been rejected.</p>\n<p><a href="${adminUrl}/admin">View in Admin Dashboard</a></p>`,
        },
        {
          trigger_name: 'order_paid',
          label: 'Order Paid (Kitchen Notification)',
          subject: '✓ PAID Order #{{order_id}} — {{fulfillment_date}}',
          body_html: `<h2>New Confirmed Order for Production</h2>\n<p><strong>Order ID:</strong> #{{order_id}}</p>\n<p><strong>Customer:</strong> {{customer_name}}</p>\n<p><strong>Fulfillment Date:</strong> {{fulfillment_date}}</p>\n<p><strong>{{fulfillment_type}}:</strong> {{fulfillment_time}}</p>\n<hr/>\n<h3>PRINT THIS SECTION FOR KITCHEN:</h3>\n{{production_sheet}}\n<hr/>\n<p><a href="${adminUrl}/admin">View Full Production Schedule</a></p>`,
        },
        {
          trigger_name: 'order_completed',
          label: 'Order Completed',
          subject: 'Order #{{order_id}} Completed — {{customer_name}}',
          body_html: `<h2>Order Completed</h2>\n<p>Order <strong>#{{order_id}}</strong> for <strong>{{customer_name}}</strong> has been marked as completed.</p>\n<p><a href="${adminUrl}/admin">View in Admin Dashboard</a></p>`,
        },
      ];
      for (const t of defaultTemplates) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO email_templates (trigger_name, label, subject, body_html) VALUES (?, ?, ?, ?)",
          args: [t.trigger_name, t.label, t.subject, t.body_html],
        });
      }
    }

    // Check if flavors table is empty and seed if needed
    const result = await db.execute("SELECT COUNT(*) as count FROM flavors");
    const count = result.rows[0]?.count as number;

    if (count === 0) {
      const defaultFlavors = [
        { name: "Cheese", description: "feta, ricotta", sort_order: 1 },
        { name: "Spinach Artichoke", description: "artichoke heart, garlic confit", sort_order: 2 },
        { name: "Potato Leek", description: "roasted Yukons, caramelized leek", sort_order: 3 },
        { name: "Seasonal", description: "varies", sort_order: 4 },
      ];

      for (const flavor of defaultFlavors) {
        await db.execute({
          sql: "INSERT INTO flavors (name, description, sort_order) VALUES (?, ?, ?)",
          args: [flavor.name, flavor.description, flavor.sort_order],
        });
      }
    }

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}
