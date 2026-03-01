import { Resend } from 'resend';
import { Order } from './types';
import { formatPrice, getFulfillmentDate, getFulfillmentTimeDisplay } from './utils';
import { db } from './db';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const PRIMARY_FROM = process.env.RESEND_FROM_EMAIL || 'BUBA Catering <orders@send.bubabureka.com>';
const FALLBACK_FROM = 'BUBA Catering <onboarding@resend.dev>';

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

// Low-level send function — falls back to onboarding@resend.dev if custom domain is not yet verified
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
) {
  if (!resend) {
    console.error('RESEND_API_KEY not set — email skipped');
    return;
  }
  const payload: Record<string, unknown> = { from: PRIMARY_FROM, to, subject, html };
  if (attachments && attachments.length > 0) payload.attachments = attachments;
  try {
    const result = await resend.emails.send(payload as any);
    console.log(`Email sent from ${PRIMARY_FROM} to ${to.join(', ')} — id: ${(result as any)?.data?.id || 'ok'}`);
  } catch (primaryErr: unknown) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.error(`Email failed from ${PRIMARY_FROM}: ${msg}`);
    if (PRIMARY_FROM === FALLBACK_FROM) throw primaryErr;
    console.log(`Retrying with fallback from: ${FALLBACK_FROM}`);
    try {
      const result = await resend.emails.send({ from: FALLBACK_FROM, to, subject, html } as any);
      console.log(`Fallback email sent to ${to.join(', ')} — id: ${(result as any)?.data?.id || 'ok'}`);
    } catch (fallbackErr: unknown) {
      const msg2 = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`Fallback email also failed: ${msg2}`);
      throw fallbackErr;
    }
  }
}

// Build a variables map from an order
function buildVariables(order: Order, productionSheetHTML?: string): Record<string, string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://buba-catering-site-production.up.railway.app';
  const fulfillmentDate = getFulfillmentDate(order);
  const fulfillmentTime = getFulfillmentTimeDisplay(order);

  const itemsHtml = order.order_data.items.map(item => `
    <p><strong>${item.type === 'party_box' ? 'Party Box' : 'Big Box'}</strong></p>
    <ul>${item.flavors.map(f => `<li>${f.name}: ${f.quantity} pcs</li>`).join('')}</ul>
  `).join('');

  // Customer-friendly: flavor names only, no piece counts
  const itemsHtmlSimple = order.order_data.items.map(item => `
    <p><strong>${item.type === 'party_box' ? 'Party Box' : 'Big Box'}</strong></p>
    <ul>${item.flavors.map(f => `<li>${f.name}</li>`).join('')}</ul>
  `).join('');

  const addonsHtml = order.order_data.addons && order.order_data.addons.length > 0
    ? `<h3>Add-ons:</h3><ul>${order.order_data.addons.map(a => `<li>${a.name} x${a.quantity}</li>`).join('')}</ul>`
    : '';

  // Human-readable date: "Thursday, March 5, 2026"
  const fulfillmentDateFormatted = fulfillmentDate
    ? new Date(fulfillmentDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : '';

  const deliveryFeeCents = order.delivery_fee || 0;
  const subtotalCents = order.total_price - deliveryFeeCents;
  const subtotalFormatted = `$${(subtotalCents / 100).toFixed(2)}`;
  const totalFormatted = `$${(order.total_price / 100).toFixed(2)}`;
  const deliveryFeeDisplay = deliveryFeeCents > 0
    ? `$${(deliveryFeeCents / 100).toFixed(2)}`
    : 'TBD';
  const priceEstimateNote = order.fulfillment_type === 'delivery'
    ? deliveryFeeCents > 0
      ? '<p><em>Your delivery fee has been confirmed and is included in the total above.</em></p>'
      : '<p><em>Note: The delivery fee will be confirmed separately and is not included in the estimated subtotal above.</em></p>'
    : '<p><em>Note: This is an estimated total. Final pricing will be confirmed when we review your order.</em></p>';

  // Used in approval email: shows the correct pricing breakdown depending on whether fee is set
  let feeBreakdownHtml: string;
  if (order.fulfillment_type === 'delivery') {
    if (deliveryFeeCents > 0) {
      feeBreakdownHtml =
        `<p><strong>Food subtotal:</strong> ${subtotalFormatted}</p>` +
        `<p><strong>Delivery fee:</strong> ${deliveryFeeDisplay}</p>` +
        `<p><strong>Estimated total (excl. tax):</strong> ${totalFormatted}</p>`;
    } else {
      feeBreakdownHtml =
        `<p><strong>Estimated food subtotal:</strong> ${subtotalFormatted}</p>` +
        `<p><em>Delivery fee will be confirmed separately and added to your total.</em></p>`;
    }
  } else {
    feeBreakdownHtml = `<p><strong>Estimated total (excl. tax):</strong> ${totalFormatted}</p>`;
  }

  return {
    order_id: String(order.id),
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    fulfillment_type: order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup',
    fulfillment_date: fulfillmentDate,
    fulfillment_date_formatted: fulfillmentDateFormatted,
    fulfillment_time: fulfillmentTime,
    delivery_address_line: order.delivery_address
      ? `<p><strong>Address:</strong> ${order.delivery_address}</p>`
      : '',
    total: `$${(order.total_price / 100).toFixed(2)}`,
    subtotal: subtotalFormatted,
    delivery_fee_display: deliveryFeeDisplay,
    price_estimate_note: priceEstimateNote,
    fee_breakdown_html: feeBreakdownHtml,
    items_html: itemsHtml + addonsHtml,
    items_html_simple: itemsHtmlSimple + addonsHtml,
    admin_url: `${baseUrl}/admin`,
    production_sheet: productionSheetHTML || '',
    rejection_reason: order.rejection_reason || '',
    serves_count: order.order_data.serves_count ? String(order.order_data.serves_count) : '',
    delivery_note: order.fulfillment_type === 'delivery'
      ? '<p><em>Since you selected delivery, we\'ll reach out shortly with a quote for the delivery fee once your order is reviewed.</em></p>'
      : '',
  };
}

// Substitute {{variable}} placeholders in a template string
function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// Core: send a notification for a given trigger
export async function sendNotification(
  triggerName: string,
  order: Order,
  productionSheetHTML?: string
) {
  try {
    // Fetch settings and template in parallel
    const [settingsResult, templateResult] = await Promise.all([
      db.execute({
        sql: "SELECT * FROM email_settings WHERE trigger_name = ?",
        args: [triggerName],
      }),
      db.execute({
        sql: "SELECT * FROM email_templates WHERE trigger_name = ?",
        args: [triggerName],
      }),
    ]);

    if (settingsResult.rows.length === 0 || templateResult.rows.length === 0) {
      console.log(`No settings/template found for trigger: ${triggerName}`);
      return;
    }

    const settings = settingsResult.rows[0];
    if (!settings.enabled) {
      console.log(`Notification disabled for trigger: ${triggerName}`);
      return;
    }

    let recipientsStr = settings.recipients as string;

    // Fall back to env vars if DB recipients are empty (handles first-deploy seeding race)
    if (!recipientsStr || !recipientsStr.trim()) {
      if (triggerName === 'order_paid') {
        recipientsStr = process.env.KITCHEN_EMAIL || process.env.ADMIN_EMAIL || '';
      } else {
        recipientsStr = process.env.ADMIN_EMAIL || '';
      }
      console.log(`DB recipients empty for ${triggerName}, falling back to env var: ${recipientsStr || '(none)'}`);
    }

    if (!recipientsStr || !recipientsStr.trim()) {
      console.log(`No recipients configured for trigger: ${triggerName}`);
      return;
    }

    const recipients = recipientsStr.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const template = templateResult.rows[0];
    const vars = buildVariables(order, productionSheetHTML);
    const subject = substitute(template.subject as string, vars);
    const html = substitute(template.body_html as string, vars);

    // For order_paid, attach a print-ready kitchen sheet as an HTML file
    let attachments: EmailAttachment[] | undefined;
    if (triggerName === 'order_paid') {
      const printHTML = generateKitchenPrintHTML(order);
      attachments = [{ filename: `order-${order.id}-kitchen-sheet.html`, content: Buffer.from(printHTML) }];
    }

    // Send admin/internal notification (failure here must NOT block customer email)
    try {
      await sendEmail(recipients, subject, html, attachments);
      console.log(`Admin notification sent for trigger: ${triggerName}, order: #${order.id}`);
    } catch (adminErr) {
      console.error(`Admin email failed for trigger ${triggerName}:`, adminErr);
      // Don't re-throw — still attempt customer email below
    }

    // Send customer-facing email if template has customer fields configured
    const customerSubject = String(template.customer_subject ?? '').trim();
    const customerBodyHtml = String(template.customer_body_html ?? '').trim();
    console.log(`Customer email check for ${triggerName}: subject="${customerSubject ? '[set]' : '[empty]'}", to="${order.customer_email}"`);
    if (customerSubject && customerBodyHtml && order.customer_email) {
      try {
        const customerSubjectFinal = substitute(customerSubject, vars);
        const customerHtmlFinal = substitute(customerBodyHtml, vars);
        await sendEmail([order.customer_email], customerSubjectFinal, customerHtmlFinal);
        console.log(`Customer email sent for trigger: ${triggerName}, to: ${order.customer_email}`);
      } catch (customerErr) {
        console.error(`Customer email failed for trigger ${triggerName}:`, customerErr);
      }
    }
  } catch (error) {
    console.error(`Failed to send notification for trigger ${triggerName}:`, error);
    throw error;
  }
}

// Send a scheduled notification (not tied to a single order) using configured recipients
export async function sendScheduledNotification(
  triggerName: string,
  subject: string,
  html: string
) {
  try {
    const settingsResult = await db.execute({
      sql: "SELECT * FROM email_settings WHERE trigger_name = ?",
      args: [triggerName],
    });
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enabled) return;

    const recipientsStr = settingsResult.rows[0].recipients as string;
    const recipients = recipientsStr.split(',').map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    await sendEmail(recipients, subject, html);
    console.log(`Scheduled notification sent for trigger: ${triggerName}`);
  } catch (err) {
    console.error(`Failed to send scheduled notification ${triggerName}:`, err);
    throw err;
  }
}

export function generateFOHScheduleHTML(orders: Order[], date: Date): string {
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const deliveries = orders.filter(o => o.fulfillment_type === 'delivery');
  const pickups = orders.filter(o => o.fulfillment_type === 'pickup');

  let html = `<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">`;
  html += `<h1 style="background: #E10600; color: white; padding: 15px 20px; margin: 0; font-size: 22px;">BUBA Catering — Tomorrow's Schedule</h1>`;
  html += `<p style="background: #222; color: white; padding: 10px 20px; margin: 0; font-size: 16px;">${dateLabel}</p>`;

  if (orders.length === 0) {
    html += `<p style="padding: 20px; color: #666;">No orders scheduled for tomorrow.</p>`;
  } else {
    html += `<p style="padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #ddd; font-weight: bold; margin: 0;">${orders.length} order${orders.length !== 1 ? 's' : ''} total — ${deliveries.length} delivery, ${pickups.length} pickup</p>`;

    if (deliveries.length > 0) {
      html += `<div style="padding: 15px 20px;">`;
      html += `<h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #E10600; padding-bottom: 5px; color: #E10600;">📦 Deliveries (${deliveries.length})</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
      html += `<tr style="background: #f0f0f0;"><th style="padding: 8px; text-align: left;">MetroSpeedy Pickup</th><th style="padding: 8px; text-align: left;">Customer Window</th><th style="padding: 8px; text-align: left;">Customer</th><th style="padding: 8px; text-align: left;">Address</th><th style="padding: 8px; text-align: left;">Phone</th><th style="padding: 8px; text-align: left;">Boxes</th></tr>`;
      deliveries
        .sort((a, b) => (a.delivery_window_start || '').localeCompare(b.delivery_window_start || ''))
        .forEach((order, i) => {
          const boxes = order.order_data.items.map(item =>
            `${item.type === 'party_box' ? 'Party' : 'Big'} x${item.quantity}`
          ).join(', ');
          const pickupTime = order.metrospeedy_pickup_time || '—';
          html += `<tr style="background: ${i % 2 === 0 ? '#fff' : '#f9f9f9'}; border-bottom: 1px solid #eee;">`;
          html += `<td style="padding: 8px; font-weight: bold; color: #c05000;">${pickupTime}</td>`;
          html += `<td style="padding: 8px;">${order.delivery_window_start}–${order.delivery_window_end}</td>`;
          html += `<td style="padding: 8px; font-weight: bold;">${order.customer_name}</td>`;
          html += `<td style="padding: 8px;">${order.delivery_address || '—'}</td>`;
          html += `<td style="padding: 8px;">${order.customer_phone}</td>`;
          html += `<td style="padding: 8px;">${boxes}</td>`;
          html += `</tr>`;
          if (order.delivery_notes) {
            html += `<tr style="background: #fffbe6;"><td colspan="6" style="padding: 6px 8px; font-size: 12px; color: #666;">📝 ${order.delivery_notes}</td></tr>`;
          }
        });
      html += `</table></div>`;
    }

    if (pickups.length > 0) {
      html += `<div style="padding: 15px 20px;">`;
      html += `<h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #222; padding-bottom: 5px;">🏪 Pickups (${pickups.length})</h2>`;
      html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
      html += `<tr style="background: #f0f0f0;"><th style="padding: 8px; text-align: left;">Time</th><th style="padding: 8px; text-align: left;">Customer</th><th style="padding: 8px; text-align: left;">Phone</th><th style="padding: 8px; text-align: left;">Boxes</th></tr>`;
      pickups
        .sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''))
        .forEach((order, i) => {
          const boxes = order.order_data.items.map(item =>
            `${item.type === 'party_box' ? 'Party' : 'Big'} x${item.quantity}`
          ).join(', ');
          html += `<tr style="background: ${i % 2 === 0 ? '#fff' : '#f9f9f9'}; border-bottom: 1px solid #eee;">`;
          html += `<td style="padding: 8px; font-weight: bold;">${order.pickup_time}</td>`;
          html += `<td style="padding: 8px; font-weight: bold;">${order.customer_name}</td>`;
          html += `<td style="padding: 8px;">${order.customer_phone}</td>`;
          html += `<td style="padding: 8px;">${boxes}</td>`;
          html += `</tr>`;
        });
      html += `</table></div>`;
    }
  }

  html += `</div>`;
  return html;
}

export function generateKitchenAlertHTML(orders: Order[], date: Date): string {
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const flavorTotals: Record<string, number> = {};
  let partyBoxes = 0;
  let bigBoxes = 0;

  orders.forEach(order => {
    order.order_data.items.forEach(item => {
      if (item.type === 'party_box') {
        partyBoxes += item.quantity;
        item.flavors.forEach(f => {
          flavorTotals[f.name] = (flavorTotals[f.name] || 0) + f.quantity;
        });
      } else {
        bigBoxes += item.quantity;
        // Big boxes use in-store stock — no production flavors to count
      }
    });
  });

  let html = `<div style="font-family: monospace; max-width: 700px; margin: 0 auto;">`;
  html += `<h1 style="background: #111; color: #fff; padding: 15px 20px; margin: 0; font-size: 20px;">🔔 KITCHEN ALERT — Production Needed</h1>`;
  html += `<p style="background: #E10600; color: white; padding: 10px 20px; margin: 0; font-weight: bold;">Fulfillment Date: ${dateLabel}</p>`;

  if (orders.length === 0) {
    html += `<p style="padding: 20px;">No orders to produce for this date.</p>`;
  } else {
    // Summary
    html += `<div style="padding: 15px 20px; background: #f0f0f0; border-bottom: 3px solid #000;">`;
    html += `<h2 style="margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase;">PRODUCTION SUMMARY</h2>`;
    html += `<table style="font-size: 14px; width: 100%;"><tr>`;
    html += `<td style="font-weight: bold;">Party Boxes: ${partyBoxes} (${partyBoxes * 40} pieces to produce)</td>`;
    html += `<td style="font-weight: bold;">Big Boxes: ${bigBoxes} (in-store stock — no production needed)</td>`;
    html += `</tr></table></div>`;

    // Flavor breakdown
    html += `<div style="padding: 15px 20px;">`;
    html += `<h2 style="font-size: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px;">FLAVORS TO PRODUCE (Party Boxes Only)</h2>`;
    html += `<table style="width: 100%; border-collapse: collapse; font-size: 15px;">`;
    Object.entries(flavorTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, qty]) => {
        html += `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">${name}</td><td style="padding: 8px; text-align: right; font-size: 18px;"><strong>${qty} pcs</strong></td></tr>`;
      });
    html += `</table></div>`;

    // Per-order checklist
    html += `<div style="padding: 15px 20px;">`;
    html += `<h2 style="font-size: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px;">ORDERS</h2>`;
    orders.forEach(order => {
      const customerTime = order.fulfillment_type === 'delivery'
        ? `customer window ${order.delivery_window_start}–${order.delivery_window_end}`
        : order.pickup_time;
      const pickupLabel = order.fulfillment_type === 'delivery' && order.metrospeedy_pickup_time
        ? ` | MetroSpeedy pickup: ${order.metrospeedy_pickup_time}`
        : '';
      html += `<div style="border: 2px solid #000; padding: 12px; margin-bottom: 12px; background: #fff;">`;
      html += `<div style="display: flex; justify-content: space-between; background: #ffe6e6; padding: 8px; margin: -12px -12px 10px -12px;">`;
      html += `<strong>Order #${order.id} — ${order.customer_name}</strong>`;
      html += `<span>${order.fulfillment_type === 'delivery' ? '📦 Delivery' : '🏪 Pickup'} ${customerTime}${pickupLabel}</span>`;
      html += `</div>`;
      order.order_data.items.forEach(item => {
        if (item.type === 'party_box') {
          html += `<div style="margin-left: 10px; border-left: 3px solid #E10600; padding-left: 8px; margin-bottom: 8px;">`;
          html += `<strong>PARTY BOX x${item.quantity}</strong><br/>`;
          item.flavors.forEach(f => { html += `&nbsp;&nbsp;• ${f.name}: ${f.quantity} pcs<br/>`; });
          html += `</div>`;
        } else {
          html += `<div style="margin-left: 10px; border-left: 3px solid #aaa; padding-left: 8px; margin-bottom: 8px; color: #555;">`;
          html += `<strong>BIG BOX x${item.quantity}</strong> — use in-store stock (no production needed)`;
          html += `</div>`;
        }
      });
      html += `</div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// Convenience wrappers kept for backward compat / external callers
export async function sendNewOrderNotification(order: Order) {
  return sendNotification('new_order', order);
}

export async function sendOrderPaidNotification(order: Order, productionSheetHTML: string) {
  return sendNotification('order_paid', order, productionSheetHTML);
}

export function generateProductionSheetHTML(orders: Order[]): string {
  const ordersByDate: { [date: string]: Order[] } = {};
  orders.forEach(order => {
    const date = getFulfillmentDate(order);
    if (!ordersByDate[date]) ordersByDate[date] = [];
    ordersByDate[date].push(order);
  });

  let html = '<div style="font-family: monospace; max-width: 800px;">';
  html += '<h1 style="text-align: center; border-bottom: 3px solid black; padding-bottom: 10px;">BUBA CATERING - PRODUCTION SCHEDULE</h1>';
  html += `<p style="text-align: center; margin-bottom: 30px;">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>`;

  Object.keys(ordersByDate).sort().forEach(date => {
    const dayOrders = ordersByDate[date];
    const dateObj = new Date(date + 'T00:00:00');

    html += `<div style="page-break-after: always; margin-bottom: 40px;">`;
    html += `<h2 style="background: black; color: white; padding: 10px;">${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>`;

    const flavorTotals: { [name: string]: number } = {};
    const addonTotals: { [name: string]: number } = {};
    let partyBoxes = 0;
    let bigBoxes = 0;

    dayOrders.forEach(order => {
      order.order_data.items.forEach(item => {
        if (item.type === 'party_box') {
          partyBoxes += item.quantity;
          item.flavors.forEach(flavor => {
            flavorTotals[flavor.name] = (flavorTotals[flavor.name] || 0) + flavor.quantity;
          });
        } else {
          bigBoxes += item.quantity;
          // Big boxes use in-store stock — exclude from production flavor totals
        }
      });
      order.order_data.addons?.forEach(addon => {
        addonTotals[addon.name] = (addonTotals[addon.name] || 0) + addon.quantity;
      });
    });

    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; background: #f0f0f0; padding: 15px;">`;
    html += `<div><strong>Party Boxes:</strong> ${partyBoxes} (${partyBoxes * 40} pcs)</div>`;
    html += `<div><strong>Big Boxes:</strong> ${bigBoxes} (${bigBoxes * 8} burekas — in-store stock)</div>`;
    html += `</div>`;

    html += '<h3 style="border-bottom: 2px solid black;">PARTY BOX FLAVOR PRODUCTION LIST:</h3>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
    Object.entries(flavorTotals).sort((a, b) => b[1] - a[1]).forEach(([name, qty]) => {
      html += `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; font-weight: bold;">${name}</td><td style="padding: 8px; text-align: right; font-size: 18px;"><strong>${qty} pieces</strong></td></tr>`;
    });
    html += '</table>';

    if (Object.keys(addonTotals).length > 0) {
      html += '<h3 style="border-bottom: 2px solid black;">ADD-ONS TO PREP:</h3>';
      html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
      Object.entries(addonTotals).forEach(([name, qty]) => {
        html += `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;">${name}</td><td style="padding: 8px; text-align: right; font-size: 16px;"><strong>${qty}x</strong></td></tr>`;
      });
      html += '</table>';
    }

    html += '<h3 style="border-bottom: 2px solid black;">ORDERS FOR THIS DAY:</h3>';
    dayOrders.forEach(order => {
      const time = order.fulfillment_type === 'delivery'
        ? `${order.delivery_window_start}-${order.delivery_window_end}`
        : order.pickup_time;

      html += `<div style="border: 2px solid black; padding: 10px; margin-bottom: 15px; background: white;">`;
      html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; background: #ffe6e6; padding: 10px;">`;
      html += `<div><strong>Order #${order.id}</strong></div>`;
      html += `<div><strong>${order.customer_name}</strong></div>`;
      html += `<div>${order.fulfillment_type === 'delivery' ? 'DELIVERY' : 'PICKUP'}: ${time}</div>`;
      html += `<div>${order.customer_phone}</div>`;
      html += `</div>`;

      if (order.fulfillment_type === 'delivery') {
        html += `<div style="background: #fff3cd; padding: 5px; margin-bottom: 10px;"><strong>Address:</strong> ${order.delivery_address}</div>`;
      }

      order.order_data.items.forEach(item => {
        if (item.type === 'party_box') {
          html += `<div style="margin-left: 15px; border-left: 4px solid #007bff; padding-left: 10px; margin-bottom: 10px;">`;
          html += `<strong>PARTY BOX x${item.quantity}</strong><br/>`;
          item.flavors.forEach(f => {
            html += `&nbsp;&nbsp;• ${f.name}: ${f.quantity} pcs<br/>`;
          });
          html += `</div>`;
        } else {
          html += `<div style="margin-left: 15px; border-left: 4px solid #aaa; padding-left: 10px; margin-bottom: 10px; color: #555;">`;
          html += `<strong>BIG BOX x${item.quantity}</strong> — use in-store stock (no production needed)`;
          html += `</div>`;
        }
      });

      if (order.order_data.addons && order.order_data.addons.length > 0) {
        html += `<div style="margin-left: 15px; border-left: 4px solid #6f42c1; padding-left: 10px;">`;
        html += `<strong>ADD-ONS:</strong><br/>`;
        order.order_data.addons.forEach(a => {
          html += `&nbsp;&nbsp;• ${a.name} x${a.quantity}<br/>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });

    html += '</div>';
  });

  html += '</div>';
  return html;
}

// Standalone print-ready HTML for a single order — used as email attachment for kitchen
export function generateKitchenPrintHTML(order: Order): string {
  const fulfillmentDate = getFulfillmentDate(order);
  const dateObj = fulfillmentDate ? new Date(fulfillmentDate + 'T00:00:00') : null;
  const dateLabel = dateObj
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const time = order.fulfillment_type === 'delivery'
    ? `${order.delivery_window_start}–${order.delivery_window_end}`
    : order.pickup_time;

  const itemsHTML = order.order_data.items.map(item => {
    if (item.type === 'party_box') {
      const flavors = item.flavors.map(f =>
        `<div style="padding: 3px 0 3px 16px;">&bull; ${f.name}: <strong>${f.quantity} pcs</strong></div>`
      ).join('');
      return `<div style="margin-bottom: 14px;"><div style="font-weight: bold; font-size: 15px;">PARTY BOX &times;${item.quantity}</div>${flavors}</div>`;
    } else {
      return `<div style="margin-bottom: 14px;"><div style="font-weight: bold; font-size: 15px;">BIG BOX &times;${item.quantity}</div><div style="padding-left: 16px; color: #555; font-style: italic;">Use in-store stock (no production needed)</div></div>`;
    }
  }).join('');

  const addonsHTML = order.order_data.addons && order.order_data.addons.length > 0
    ? `<div style="margin-top: 12px; border-top: 1px solid #ddd; padding-top: 12px;"><div style="font-weight: bold; font-size: 15px; margin-bottom: 6px;">ADD-ONS</div>${order.order_data.addons.map(a => `<div style="padding: 3px 0 3px 16px;">&bull; ${a.name} &times;${a.quantity}</div>`).join('')}</div>`
    : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Order #${order.id} — Kitchen Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: monospace; font-size: 14px; background: #fff; color: #000; padding: 20px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 20px; background: #111; color: #fff; padding: 12px 16px; }
  .bar { background: #E10600; color: #fff; font-weight: bold; font-size: 14px; padding: 8px 16px; margin-bottom: 20px; }
  .section { border: 2px solid #000; margin-bottom: 16px; }
  .section-head { background: #f0f0f0; border-bottom: 2px solid #000; padding: 7px 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .section-body { padding: 12px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
  .row:last-child { border-bottom: none; }
  @media print { body { padding: 10px; } }
</style>
</head><body>
<h1>BUBA Catering — Kitchen Sheet</h1>
<div class="bar">Order #${order.id} &nbsp;|&nbsp; ${order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'} &nbsp;|&nbsp; ${dateLabel}</div>

<div class="section">
  <div class="section-head">Customer &amp; Fulfillment</div>
  <div class="section-body">
    <div class="row"><span>Customer:</span><strong>${order.customer_name}</strong></div>
    <div class="row"><span>Phone:</span><span>${order.customer_phone}</span></div>
    <div class="row"><span>Type:</span><span>${order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</span></div>
    <div class="row"><span>Time:</span><strong>${time}</strong></div>
    ${order.fulfillment_type === 'delivery' ? `<div class="row"><span>Address:</span><span>${order.delivery_address || '—'}</span></div>` : ''}
    ${order.delivery_notes ? `<div class="row"><span>Notes:</span><span>${order.delivery_notes}</span></div>` : ''}
  </div>
</div>

<div class="section">
  <div class="section-head">What to Prepare</div>
  <div class="section-body">
    ${itemsHTML}${addonsHTML}
  </div>
</div>
</body></html>`;
}
