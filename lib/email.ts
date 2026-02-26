import { Resend } from 'resend';
import { Order } from './types';
import { formatPrice, getFulfillmentDate, getFulfillmentTimeDisplay } from './utils';
import { db } from './db';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const PRIMARY_FROM = process.env.RESEND_FROM_EMAIL || 'BUBA Catering <orders@send.bubabureka.com>';
const FALLBACK_FROM = 'BUBA Catering <onboarding@resend.dev>';

// Low-level send function — falls back to onboarding@resend.dev if custom domain is not yet verified
async function sendEmail(to: string[], subject: string, html: string) {
  if (!resend) {
    console.error('RESEND_API_KEY not set — email skipped');
    return;
  }
  try {
    const result = await resend.emails.send({ from: PRIMARY_FROM, to, subject, html });
    console.log(`Email sent from ${PRIMARY_FROM} to ${to.join(', ')} — id: ${(result as any)?.data?.id || 'ok'}`);
  } catch (primaryErr: unknown) {
    const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.error(`Email failed from ${PRIMARY_FROM}: ${msg}`);
    if (PRIMARY_FROM === FALLBACK_FROM) throw primaryErr; // avoid infinite loop
    console.log(`Retrying with fallback from: ${FALLBACK_FROM}`);
    try {
      const result = await resend.emails.send({ from: FALLBACK_FROM, to, subject, html });
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

  const addonsHtml = order.order_data.addons && order.order_data.addons.length > 0
    ? `<h3>Add-ons:</h3><ul>${order.order_data.addons.map(a => `<li>${a.name} x${a.quantity}</li>`).join('')}</ul>`
    : '';

  return {
    order_id: String(order.id),
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    fulfillment_type: order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup',
    fulfillment_date: fulfillmentDate,
    fulfillment_time: fulfillmentTime,
    delivery_address_line: order.delivery_address
      ? `<p><strong>Address:</strong> ${order.delivery_address}</p>`
      : '',
    total: `$${(order.total_price / 100).toFixed(2)}`,
    items_html: itemsHtml + addonsHtml,
    admin_url: `${baseUrl}/admin`,
    production_sheet: productionSheetHTML || '',
    rejection_reason: order.rejection_reason || '',
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

    // Send admin/internal notification (failure here must NOT block customer email)
    try {
      await sendEmail(recipients, subject, html);
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
        if (item.type === 'party_box') partyBoxes++;
        else bigBoxes++;
        item.flavors.forEach(flavor => {
          flavorTotals[flavor.name] = (flavorTotals[flavor.name] || 0) + flavor.quantity;
        });
      });
      order.order_data.addons?.forEach(addon => {
        addonTotals[addon.name] = (addonTotals[addon.name] || 0) + addon.quantity;
      });
    });

    html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; background: #f0f0f0; padding: 15px;">`;
    html += `<div><strong>Party Boxes:</strong> ${partyBoxes} (${partyBoxes * 40} pcs)</div>`;
    html += `<div><strong>Big Boxes:</strong> ${bigBoxes} (${bigBoxes * 8} pcs)</div>`;
    html += `</div>`;

    html += '<h3 style="border-bottom: 2px solid black;">FLAVOR PRODUCTION LIST:</h3>';
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
        html += `<div style="margin-left: 15px; border-left: 4px solid #007bff; padding-left: 10px; margin-bottom: 10px;">`;
        html += `<strong>${item.type === 'party_box' ? 'PARTY BOX' : 'BIG BOX'}</strong><br/>`;
        item.flavors.forEach(f => {
          html += `&nbsp;&nbsp;• ${f.name}: ${f.quantity} pcs<br/>`;
        });
        html += `</div>`;
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
