# Phase 5: Polish and Deploy

Final polish and deployment prep for the BUBA catering app.

## New pages:

### /app/confirmation/[id]/page.tsx
- After successful order submission, redirect here instead of showing inline confirmation
- Displays: "Order Received!" heading, order ID, summary of what was ordered, delivery date/time, and message: "We'll review your order and send a confirmation email shortly."
- "Place Another Order" link back to /
- Update the order form to redirect to /confirmation/[id] after successful POST

### /app/admin/settings/page.tsx
- Add "Settings" to the admin sidebar navigation
- Fields:
  - Party Box piece count (number input, default 15) — this controls validation for party box flavor quantities
  - Kitchen email (text input, overrides KITCHEN_EMAIL env var)
  - Contact email (text input, overrides BUBA_CONTACT_EMAIL env var)
- Save to a "settings" table in Turso (key-value: setting_name TEXT PRIMARY KEY, setting_value TEXT)
- Load these settings in the API routes that use them instead of reading env vars directly. Fall back to env vars if no setting is stored.
- Add initDb() update to create the settings table.

## Improvements:

### Rate limiting
- Add simple rate limiting to POST /api/orders: max 10 orders per IP per hour
- Store in a "rate_limits" table (ip TEXT, timestamp TEXT). Clean up entries older than 1 hour on each check.
- Return 429 with { error: "Too many orders. Please try again later." }

### Error handling
- Make sure the order form shows clear, user-friendly error messages if submission fails (network error, validation error, rate limit)
- Make sure admin actions show clear feedback on success or failure

### Mobile polish
- Test that the order form works well on mobile viewport (375px wide)
- Make sure the sticky order total doesn't overlap content
- Admin sidebar should collapse to a hamburger menu on mobile

## Deployment:

### Prepare for Vercel:
- Create a .env.example file listing all required env vars with descriptions (no real values)
- Create a project README.md with:
  - Project description (one paragraph)
  - Setup instructions: install deps, create Turso DB, create Resend account, fill in .env.local
  - How to run locally: npm run dev
  - How to deploy to Vercel: connect repo, add env vars in Vercel dashboard, deploy
  - Note that TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in Vercel's environment variables
- Make sure there are no hardcoded localhost URLs anywhere
- Make sure all API routes work with relative URLs (no absolute http://localhost references)

## Final check:
Run the dev server and test the complete flow end to end:
1. Submit an order through the customer form
2. Log into admin dashboard
3. Approve the order (verify customer gets confirmation email)
4. Mark as paid
5. Download prep sheet PDF
6. Notify kitchen (verify kitchen gets email with PDF)
7. Mark complete

Report any issues found during testing.
