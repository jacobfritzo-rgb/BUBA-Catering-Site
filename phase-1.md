# Phase 1: Database, Data Models, and API Routes

Build the backend foundation for a catering order system using Next.js (App Router) with Turso (libSQL) as the database. Initialize the Next.js project in this folder (the project root should be here, not in a subfolder).

## Tech Stack
- Next.js 14+ (App Router), TypeScript
- @libsql/client for Turso database connection
- Tailwind CSS (install and configure now, we'll use it in later phases)
- Turso credentials are in .env.local as TURSO_DATABASE_URL and TURSO_AUTH_TOKEN

## File Structure
Create these files:
- /lib/db.ts — Turso client singleton + table initialization function
- /lib/types.ts — TypeScript types for orders, flavors, etc.
- /app/api/orders/route.ts — POST (create order), GET (list orders)
- /app/api/orders/[id]/route.ts — GET (single order), PATCH (update status)
- /app/api/flavors/route.ts — GET (list flavors), POST (add), DELETE (remove)

Also create a .env.local file with placeholder values for: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, RESEND_API_KEY, ADMIN_USER, ADMIN_PASS, KITCHEN_EMAIL, BUBA_CONTACT_EMAIL. The user will fill in the real values.

## Database Tables

### orders
- id INTEGER PRIMARY KEY AUTOINCREMENT
- status TEXT NOT NULL DEFAULT 'pending' — enum: pending, approved, rejected, paid, completed
- created_at TEXT NOT NULL — ISO 8601 timestamp
- customer_name TEXT NOT NULL
- customer_email TEXT NOT NULL
- customer_phone TEXT NOT NULL
- delivery_date TEXT NOT NULL — ISO date (YYYY-MM-DD)
- delivery_window_start TEXT NOT NULL — e.g. "14:00"
- delivery_window_end TEXT NOT NULL — e.g. "14:30"
- delivery_address TEXT NOT NULL
- delivery_notes TEXT — optional
- sms_opt_in INTEGER NOT NULL DEFAULT 0
- email_opt_in INTEGER NOT NULL DEFAULT 0
- order_data TEXT NOT NULL — JSON string (structure below)
- production_deadline TEXT NOT NULL — auto-calculated: delivery_date minus 1 day
- bake_deadline TEXT NOT NULL — auto-calculated: delivery_window_start minus 45 minutes on delivery_date
- total_price INTEGER NOT NULL — in cents
- kitchen_notified INTEGER NOT NULL DEFAULT 0

### flavors
- id INTEGER PRIMARY KEY AUTOINCREMENT
- name TEXT NOT NULL UNIQUE
- description TEXT
- available INTEGER NOT NULL DEFAULT 1
- sort_order INTEGER NOT NULL DEFAULT 0

### order_data JSON structure:
```json
{
  "items": [
    {
      "type": "party_box | forty_piece",
      "quantity": 1,
      "price_cents": 22500,
      "flavors": [
        { "name": "Cheese", "quantity": 5 },
        { "name": "Potato Leek", "quantity": 10 }
      ]
    }
  ],
  "addons": [
    { "name": "4 Jammy Eggs", "quantity": 1, "price_cents": 350 },
    { "name": "Extra Dip", "quantity": 2, "price_cents": 800 }
  ]
}
```

## Database Initialization
In /lib/db.ts:
- Create a Turso client using createClient from @libsql/client with the env vars
- Export an initDb() function that creates both tables if they don't exist
- Seed the flavors table with defaults if it's empty:
  1. Cheese — "feta, ricotta"
  2. Spinach Artichoke — "artichoke heart, garlic confit"
  3. Potato Leek — "roasted Yukons, caramelized leek"
  4. Seasonal — "varies"
- Call initDb() at the top of every API route (it should be idempotent — only creates/seeds if needed)

## Validation Rules (enforce in POST /api/orders):
- delivery_date must be >= 72 hours from now
- delivery_date must NOT be a Monday or Tuesday (BUBA is closed)
- Party Box: max 4 flavors per box, flavor quantities must sum to 15
- 40-Piece Box: max 3 flavors per box, flavor quantities must sum to 40
- At least one box in the order
- customer_name, customer_email, customer_phone all required and non-empty
- delivery_address required
- All referenced flavor names must exist in the flavors table

## Auto-calculations (in POST /api/orders):
- production_deadline = delivery_date minus 1 day (as ISO date string)
- bake_deadline = delivery_date + delivery_window_start minus 45 minutes (as ISO datetime string)
- total_price = sum of all item prices * quantities + all addon prices * quantities

## API Behavior:
- POST /api/orders — validates, calculates, inserts, returns { id, status: "pending" }
- GET /api/orders — returns all orders newest first. Optional query param ?status=pending|approved|etc
- GET /api/orders/[id] — returns full order object with parsed order_data (return as object, not string)
- PATCH /api/orders/[id] — accepts { status } or { kitchen_notified: 1 }. Validates status transitions:
  - pending → approved or rejected
  - approved → paid
  - paid → completed
  - No other transitions allowed. Return 400 for invalid transitions.
- GET /api/flavors — returns all flavors ordered by sort_order
- POST /api/flavors — accepts { name, description }, inserts with next sort_order
- DELETE /api/flavors — accepts { name }, deletes by name. Return 400 if flavor is referenced in any non-completed order.

## Error Handling:
- All API routes return JSON: { error: "message" } with appropriate HTTP status codes on failure
- Wrap all DB calls in try/catch

## When done:
- Do NOT build any UI
- Do NOT read the other phase files
- Tell the user Phase 1 is complete and to test the API before moving on
