# Phase 3: Admin Dashboard

Add a password-protected admin dashboard to the existing Next.js catering app. The backend API already exists. Do not modify any existing API routes or the customer-facing form.

## Create these files:
- /app/admin/page.tsx — dashboard
- /app/admin/login/page.tsx — simple login page
- /app/api/admin/login/route.ts — POST login endpoint
- /lib/auth.ts — basic auth helper (JWT with jose library)
- /components/admin/OrderList.tsx — order list
- /components/admin/OrderDetail.tsx — single order view with actions
- /components/admin/FlavorManager.tsx — add/remove/toggle flavors
- /middleware.ts — protect /admin routes (except /admin/login)

## Auth:
- Credentials from environment variables: ADMIN_USER, ADMIN_PASS
- POST /api/admin/login accepts { username, password }, validates against env vars, returns a signed JWT
- Store JWT in an HTTP-only cookie called "admin_token"
- Use jose library for JWT signing/verification
- Middleware checks for valid admin_token cookie on all /admin routes except /admin/login. Redirect to /admin/login if missing or invalid.

## Dashboard Layout:
- Left sidebar (collapsible on mobile) with nav links: "Orders" and "Flavors"
- Main content area
- Simple, functional design. Tailwind defaults. This is an internal tool — clarity over aesthetics.

## Orders View (default):
- Tab filters across top: All | Pending | Approved | Paid | Completed | Rejected
- Each order row shows: Order ID, customer name, delivery date, total boxes, total price, status badge (color-coded)
- Click a row to expand OrderDetail inline below it (accordion style, not a separate page)

## OrderDetail (expanded view):
- Full order breakdown: each box with its flavor split, add-ons, delivery info, contact info, delivery notes
- Status action buttons depending on current status:
  - Pending → "Approve" or "Reject" buttons
  - Approved → "Mark as Paid" button
  - Paid → "Mark Complete" button
- "Copy for Toast" button that copies this pre-formatted text to clipboard:

```
BUBA Catering Order #[ID]
Customer: [name] — [email] — [phone]

[For each box:]
[Box type] x[quantity] — $[price]
  [Flavor]: [qty] pcs
  [Flavor]: [qty] pcs

[For each addon:]
[Addon name] x[quantity] — $[price]

Total: $[total]
Delivery: [date] [window] to [address]
Notes: [delivery_notes or "None"]
```

- Show production deadline and bake deadline (always visible, but bold/highlighted when status is "paid")

## Flavor Manager:
- List all flavors with:
  - Toggle switch for available/unavailable
  - Delete button (with confirmation dialog)
- "Add Flavor" form at bottom: name input + description input + submit button
- Show flavors in sort_order

## Important:
- All actions (approve, reject, mark paid, etc.) should call PATCH /api/orders/[id] and refresh the order data on success
- Show a brief success/error toast or inline message after actions

## When done:
- Do NOT read the other phase files
- Do NOT build PDF generation, notifications, or deployment features
- Tell the user Phase 3 is complete and to test the dashboard before moving on
