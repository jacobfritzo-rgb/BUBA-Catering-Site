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
