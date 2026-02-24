# Phase 2: Customer Order Form

Add a customer-facing order form to the existing Next.js catering app. The backend API already exists at /api/orders (POST) and /api/flavors (GET). Do not modify any existing API routes.

## Create these files:
- /app/page.tsx — the order form (this is the public-facing page)
- /components/OrderForm.tsx — main form component
- /components/BoxConfigurator.tsx — component for configuring a single box (flavor picker)
- /components/AddonsSelector.tsx — add-on checkboxes with quantity

## Design:
- Use Tailwind CSS (already configured)
- Colors: warm cream background (#FFF8F0), dark brown text (#3D2B1F), accent gold (#C9A84C)
- Mobile-first, single column layout
- Clean, minimal — think high-end fast casual
- No placeholder images for now. Just clean typography and spacing.

## Form Flow:
1. Header: "BUBA Catering" + short intro text: "Fresh burekas for your next gathering. Order at least 72 hours in advance."
2. Box selector: Customer clicks "Add Party Box ($225)" or "Add 40-Piece Box ($78)" buttons. Can add multiple boxes.
3. For each box added, show a BoxConfigurator:
   - Display available flavors (fetched from /api/flavors on page load)
   - For each flavor, show a +/- stepper to set quantity of pieces
   - Show running total of pieces selected vs. required (Party Box = 15, 40-Piece = 40)
   - Visual indicator when piece count is correct (green) vs incomplete or over (red)
   - Show a "Remove box" button
4. Add-ons section:
   - "4 Jammy Eggs — $3.50" with quantity stepper (0-10)
   - "Extra Dip — $8.00" with quantity stepper (0-10)
5. Delivery details:
   - Date picker (min date = today + 3 days, exclude Mondays and Tuesdays)
   - Delivery window: dropdown of 30-min slots from 10:00am to 7:00pm
   - Address (text input)
   - Delivery notes (optional textarea)
6. Contact info: name, email, phone
7. Marketing opt-in: two checkboxes — "Text me about future drops" / "Email me about future drops"
8. Running order total at bottom, sticky on mobile
9. Submit button — posts to /api/orders, shows confirmation message with order ID on success

## Validation (client-side, matching server rules):
- All flavor quantities must sum correctly per box
- Date must be 72+ hours out and not Mon/Tue
- Name, email, phone required
- At least one box in the order

## Important:
- "Party Mix" is NOT a separate flavor. It just means the customer chose multiple flavors in one box. Don't show it as a flavor option.
- The form should feel fast. No unnecessary animations or loading states.
- After successful submission, show a simple confirmation screen: "Order received! We'll be in touch shortly." with the order ID.

## When done:
- Do NOT read the other phase files
- Do NOT build the admin dashboard or any other features
- Tell the user Phase 2 is complete and to test the form before moving on
