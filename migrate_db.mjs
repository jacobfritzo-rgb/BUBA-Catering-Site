import { createClient } from "@libsql/client";
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

async function migrate() {
  const db = createClient({
    url: envVars.TURSO_DATABASE_URL,
    authToken: envVars.TURSO_AUTH_TOKEN,
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
