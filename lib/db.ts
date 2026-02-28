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
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const kitchenEmail = process.env.KITCHEN_EMAIL || '';
    if ((settingsResult.rows[0].count as number) === 0) {
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
    } else if (adminEmail || kitchenEmail) {
      // Update any rows that were seeded with empty recipients (handles first-deploy race condition)
      const adminTriggers = ['new_order', 'order_approved', 'order_rejected', 'order_completed'];
      for (const trigger of adminTriggers) {
        if (adminEmail) {
          await db.execute({
            sql: "UPDATE email_settings SET recipients = ? WHERE trigger_name = ? AND (recipients = '' OR recipients IS NULL)",
            args: [adminEmail, trigger],
          });
        }
      }
      if (kitchenEmail) {
        await db.execute({
          sql: "UPDATE email_settings SET recipients = ? WHERE trigger_name = 'order_paid' AND (recipients = '' OR recipients IS NULL)",
          args: [kitchenEmail],
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

    // Create order_notes table for CRM activity log
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        note_type TEXT NOT NULL,
        content TEXT NOT NULL
      )
    `);

    // Create product_images table for admin-uploaded photos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        key TEXT PRIMARY KEY,
        image_data TEXT NOT NULL,
        content_type TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Seed party-box image from static file if not already in DB
    const partyBoxResult = await db.execute(
      "SELECT key FROM product_images WHERE key = 'party-box'"
    );
    if (partyBoxResult.rows.length === 0) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const imagePath = path.join(process.cwd(), "public", "images", "party-box.jpg");
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          const base64 = imageBuffer.toString("base64");
          await db.execute({
            sql: "INSERT OR IGNORE INTO product_images (key, image_data, content_type, updated_at) VALUES (?, ?, ?, ?)",
            args: ["party-box", base64, "image/jpeg", new Date().toISOString()],
          });
        }
      } catch {
        // Static file may not be available in all environments
      }
    }

    // Migrate orders table: add new columns if they don't exist yet
    const ordersMigrations = [
      "ALTER TABLE orders ADD COLUMN rejection_reason TEXT",
      "ALTER TABLE orders ADD COLUMN metrospeedy_status TEXT DEFAULT 'not_submitted'",
      "ALTER TABLE orders ADD COLUMN metrospeedy_notes TEXT",
      "ALTER TABLE orders ADD COLUMN production_done INTEGER DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN production_done_at TEXT",
    ];
    for (const sql of ordersMigrations) {
      try { await db.execute(sql); } catch { /* column already exists */ }
    }

    // Seed new event + scheduled notification triggers if they don't exist
    const newTriggers = [
      { trigger_name: 'production_done', enabled: 1, recipients: adminEmail },
      { trigger_name: 'daily_schedule_foh', enabled: 0, recipients: '' },
      { trigger_name: 'production_alert_kitchen', enabled: 0, recipients: kitchenEmail },
    ];
    for (const t of newTriggers) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO email_settings (trigger_name, enabled, recipients) VALUES (?, ?, ?)",
        args: [t.trigger_name, t.enabled, t.recipients],
      });
    }

    // Seed new email templates if they don't exist
    const baseUrl2 = process.env.NEXT_PUBLIC_BASE_URL || 'https://buba-catering-site-production.up.railway.app';
    const newTemplates = [
      {
        trigger_name: 'production_done',
        label: 'Production Marked Done',
        subject: '✅ Production Done — Order #{{order_id}} ({{customer_name}})',
        body_html: `<h2>Production Complete</h2><p>Staff has marked production as done for Order <strong>#{{order_id}}</strong>.</p><p><strong>Customer:</strong> {{customer_name}}</p><p><strong>Fulfillment:</strong> {{fulfillment_type}} on {{fulfillment_date}} at {{fulfillment_time}}</p><p><a href="${baseUrl2}/admin">View in Admin Dashboard</a></p>`,
      },
      {
        trigger_name: 'daily_schedule_foh',
        label: 'Daily Schedule (FOH)',
        subject: "Tomorrow's Catering Schedule — {{schedule_date}}",
        body_html: `<h2>Tomorrow's Catering Schedule</h2><p>{{schedule_html}}</p>`,
      },
      {
        trigger_name: 'production_alert_kitchen',
        label: 'Kitchen Production Alert',
        subject: 'Production Needed — {{schedule_date}}',
        body_html: `<h2>Production Alert</h2><p>{{production_html}}</p>`,
      },
    ];
    for (const t of newTemplates) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO email_templates (trigger_name, label, subject, body_html) VALUES (?, ?, ?, ?)",
        args: [t.trigger_name, t.label, t.subject, t.body_html],
      });
    }

    // Migrate email_templates table: add customer email columns if they don't exist
    const templatesMigrations = [
      "ALTER TABLE email_templates ADD COLUMN customer_subject TEXT DEFAULT ''",
      "ALTER TABLE email_templates ADD COLUMN customer_body_html TEXT DEFAULT ''",
    ];
    for (const sql of templatesMigrations) {
      try { await db.execute(sql); } catch { /* column already exists */ }
    }

    // Seed customer email templates for approved/rejected if not yet populated
    // NOTE: SQLite ALTER TABLE ADD COLUMN DEFAULT '' doesn't physically write '' to existing rows,
    // so we can't rely on WHERE customer_subject = '' to match. Instead, read and check in JS.
    const customerTemplateDefaults: Record<string, { subject: string; body: string }> = {
      'new_order': {
        subject: 'We received your BUBA Catering request #{{order_id}}!',
        body: `<p>Hi {{customer_name}},</p><p>Thanks for submitting your catering request! We've received your order and will review it shortly.</p><p><strong>Order summary:</strong></p><p>{{fulfillment_type}} on {{fulfillment_date}} at {{fulfillment_time}}</p><p><strong>Total:</strong> {{total}}</p>{{items_html}}<p>We'll be in touch once your order has been reviewed. If you have any questions in the meantime, feel free to reach out.</p><p>— The BUBA Team</p>`,
      },
      'order_approved': {
        subject: 'Your BUBA Catering order #{{order_id}} is confirmed!',
        body: `<p>Hi {{customer_name}},</p><p>Great news — your catering order has been approved!</p><p>You'll receive an invoice from <strong>Toast</strong> shortly. To finalize your order, please pay the invoice when it arrives.</p><p><strong>Order details:</strong> {{fulfillment_type}} on {{fulfillment_date}} at {{fulfillment_time}}</p><p><strong>Total:</strong> {{total}}</p><p>Thank you for choosing BUBA Catering!</p>`,
      },
      'order_rejected': {
        subject: 'Regarding your BUBA Catering order #{{order_id}}',
        body: `<p>Hi {{customer_name}},</p><p>Thank you for your interest in BUBA Catering. Unfortunately, we're unable to fulfill your order at this time.</p><p>{{rejection_reason}}</p><p>We hope to serve you in the future. Please don't hesitate to reach out with any questions.</p><p>— The BUBA Team</p>`,
      },
    };
    for (const [trigger, defaults] of Object.entries(customerTemplateDefaults)) {
      const existing = await db.execute({
        sql: "SELECT customer_subject FROM email_templates WHERE trigger_name = ?",
        args: [trigger],
      });
      if (existing.rows.length > 0) {
        const currentVal = existing.rows[0].customer_subject;
        // Use JS-level check — handles null, undefined, '', and SQLite virtual defaults
        if (!currentVal || String(currentVal).trim() === '') {
          await db.execute({
            sql: "UPDATE email_templates SET customer_subject = ?, customer_body_html = ? WHERE trigger_name = ?",
            args: [defaults.subject, defaults.body, trigger],
          });
          console.log(`Seeded customer email template for: ${trigger}`);
        }
      }
    }

    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}
