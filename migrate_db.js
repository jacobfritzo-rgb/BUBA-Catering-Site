const { createClient } = require("@libsql/client");
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Check if fulfillment_type column exists
    const tableInfo = await db.execute("PRAGMA table_info(orders)");
    const hasFulfillmentType = tableInfo.rows.some(row => row.name === 'fulfillment_type');
    
    if (!hasFulfillmentType) {
      console.log("Adding fulfillment_type column...");
      await db.execute("ALTER TABLE orders ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'pickup'");
      console.log("✓ Added fulfillment_type column");
    } else {
      console.log("✓ fulfillment_type column already exists");
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrate();
