# Email Notification Setup Guide

## Quick Setup (5 minutes)

### 1. Get Resend API Key
1. Go to https://resend.com and create a free account
2. Get your API key from the dashboard
3. Free tier includes 3,000 emails/month (more than enough for catering)

### 2. Add to .env.local

Add these lines to your `.env.local` file:

```bash
# Email Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_DOMAIN=resend.dev

# Who gets notified when new order submitted (admin/manager)
ADMIN_EMAIL=your-email@example.com

# Who gets notified when order is paid (kitchen staff)
# Can be the same as ADMIN_EMAIL if you manage both
KITCHEN_EMAIL=kitchen@example.com

# Optional: Your site URL for links in emails
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 3. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## How It Works

### When Order is Submitted → ADMIN_EMAIL gets notified
**Email contains:**
- Order ID and customer details
- What they ordered (boxes, flavors, add-ons)
- Pickup/delivery date and time
- Link to admin dashboard

**Purpose:** You review the order, approve it, and contact customer with final quote

---

### When Order Marked as PAID → KITCHEN_EMAIL gets notified
**Email contains:**
- Confirmation that order is paid
- **Full production sheet HTML** (ready to print)
- Summary of ALL paid orders grouped by date

**Purpose:** Kitchen staff immediately see what needs to be made

---

### Anytime → Print Production Sheet
- Go to Admin → Production tab
- Click **"Print Production Sheet for Kitchen"**
- Opens printable page with all paid orders
- Auto-triggers print dialog
- Post on kitchen wall

## Email Workflow Summary

```
1. Customer submits order
   ↓
2. Email → ADMIN_EMAIL (you get notified)
   ↓
3. You review in admin dashboard
   ↓
4. You contact customer with final quote
   ↓
5. Customer pays
   ↓
6. You mark order as "Paid" in admin
   ↓
7. Email → KITCHEN_EMAIL with production sheet
   ↓
8. Kitchen prints and posts on wall
```

## Testing Email Notifications

1. **Submit a test order** on the customer-facing page
2. Check ADMIN_EMAIL inbox
3. **Approve the order** in admin
4. **Mark it as Paid**
5. Check KITCHEN_EMAIL inbox for production sheet

## Production Setup (Optional)

For better email deliverability, verify your own domain in Resend:

1. Add your domain in Resend dashboard
2. Add DNS records they provide
3. Change `RESEND_DOMAIN` in `.env.local` to your domain
4. Emails will come from `orders@yourdomain.com`

## Troubleshooting

**Emails not sending?**
- Check `.env.local` has correct RESEND_API_KEY
- Check ADMIN_EMAIL and KITCHEN_EMAIL are valid
- Restart dev server after changing .env.local
- Check Resend dashboard for logs

**Build failing?**
- Email system is optional - app works without it
- Missing API key at build-time is OK (it just logs a message)
- Emails only send when API key is configured

## No Email? No Problem!

The system works fine without email configured:
- You can still use the admin dashboard
- Print production sheets manually
- Check orders in the "Orders" tab
- Use "Production" tab to see what's coming up

Email just makes it more convenient!
