# Phase 4: Prep Sheet PDF + Email Notifications

Add prep sheet PDF generation and email notifications to the existing Next.js catering app. Do not modify any existing files unless explicitly stated below.

## Install:
- @react-pdf/renderer for PDF generation
- resend for email sending

## Create these files:
- /app/api/orders/[id]/prep-sheet/route.ts — GET returns PDF as downloadable file
- /lib/pdf.ts — PDF generation function using @react-pdf/renderer
- /lib/notifications.ts — email sending functions using Resend
- /app/api/orders/[id]/notify-kitchen/route.ts — POST triggers kitchen email with PDF attached

## Prep Sheet PDF:
Generate a clean, printable black-and-white PDF with large font, meant for printing on letter paper and posting on the kitchen wall.

Content:
- Header: "BUBA CATERING — PREP SHEET"
- Order ID
- Customer name & phone only (kitchen doesn't need email)
- Delivery date and time window
- Delivery address
- PRODUCTION DEADLINE: [production_deadline] — large, bold
- BAKE DEADLINE: [bake_deadline] — large, bold
- Table:
  | Box Type | Flavor | Pieces |
  With a totals row showing total pieces
- Add-ons list (if any)
- Delivery notes (if any)
- Footer: "Print and post on wall"

## Email Notifications (using Resend, key in RESEND_API_KEY env var):

### When order status changes to "approved":
Automatically send email to customer_email:
- From: "BUBA Catering" <onboarding@resend.dev> (use Resend's default sender until domain is verified)
- Subject: "BUBA Catering — Order #[ID] Confirmed"
- Body (plain text is fine, no fancy HTML needed):

```
Your catering order has been confirmed! You'll receive a Toast invoice shortly. Please complete payment to finalize your order.

Order Summary:
[itemized list of boxes, flavors, addons, total]

Delivery: [date] [window] to [address]

Questions? Reply to this email or contact us at [BUBA_CONTACT_EMAIL].
```

### When order status changes to "rejected":
Automatically send email to customer_email:
- Subject: "BUBA Catering — Order Update"
- Body: "Unfortunately we're unable to fulfill your catering order #[ID] for [delivery_date]. Please reach out to us at [BUBA_CONTACT_EMAIL] if you'd like to discuss alternatives."

### When owner clicks "Notify Kitchen" (POST /api/orders/[id]/notify-kitchen):
- Generate the prep sheet PDF
- Send email to KITCHEN_EMAIL env var with the PDF attached
- Subject: "PREP SHEET — Order #[ID] — Deliver [delivery_date] [delivery_window]"
- Body: "Prep sheet attached. Production deadline: [production_deadline]. Bake deadline: [bake_deadline]."
- Update the order's kitchen_notified field to 1

## Modifications to existing files:

### /app/api/orders/[id]/route.ts — PATCH handler:
After successfully updating status to "approved", call the notification function to email the customer the confirmation.
After successfully updating status to "rejected", call the notification function to email the customer the rejection.
Wrap notification calls in try/catch — if email fails, still return success for the status update but log the error. Don't block the status change on email delivery.

### /components/admin/OrderDetail.tsx:
- Add "Download Prep Sheet" button — links to /api/orders/[id]/prep-sheet (opens PDF in new tab). Visible when status is approved, paid, or completed.
- Add "Notify Kitchen" button — calls POST /api/orders/[id]/notify-kitchen. Only visible when status is "paid". After success, disable the button and show "Kitchen Notified ✓" instead. If kitchen_notified is already 1 when the order loads, show the disabled state immediately.

## When done:
- Do NOT read the other phase files
- Do NOT build settings pages, deployment features, or anything not listed here
- Tell the user Phase 4 is complete and to test the full flow before moving on
