import { Resend } from 'resend';
import { Order } from './types';
import { formatPrice, getFulfillmentDate, getFulfillmentTimeDisplay } from './utils';

// Only initialize if API key is available (optional for build-time)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendNewOrderNotification(order: Order) {
  if (!process.env.ADMIN_EMAIL || !process.env.RESEND_API_KEY || !resend) {
    console.log('Email not configured - skipping notification');
    return;
  }

  const fulfillmentDate = getFulfillmentDate(order);
  const fulfillmentTime = getFulfillmentTimeDisplay(order);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BUBA Catering <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `New Catering Request #${order.id} - ${order.customer_name}`,
      html: `
        <h2>New Catering Order Request</h2>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Email:</strong> ${order.customer_email}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Type:</strong> ${order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
        <p><strong>Date:</strong> ${fulfillmentDate}</p>
        <p><strong>Time:</strong> ${fulfillmentTime}</p>
        ${order.fulfillment_type === 'delivery' ? `<p><strong>Address:</strong> ${order.delivery_address}</p>` : ''}
        <p><strong>Total:</strong> $${formatPrice(order.total_price)}</p>

        <h3>Order Details:</h3>
        ${order.order_data.items.map(item => `
          <p><strong>${item.type === 'party_box' ? 'Party Box' : 'Big Box'}</strong></p>
          <ul>
            ${item.flavors.map(f => `<li>${f.name}: ${f.quantity} pcs</li>`).join('')}
          </ul>
        `).join('')}

        ${order.order_data.addons && order.order_data.addons.length > 0 ? `
          <h3>Add-ons:</h3>
          <ul>
            ${order.order_data.addons.map(a => `<li>${a.name} x${a.quantity}</li>`).join('')}
          </ul>
        ` : ''}

        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin">View in Admin Dashboard</a></p>
      `,
    });
    console.log(`New order notification sent for order #${order.id}`);
  } catch (error) {
    console.error('Failed to send new order notification:', error);
  }
}

export async function sendOrderPaidNotification(order: Order, productionSheetHTML: string) {
  if (!process.env.KITCHEN_EMAIL || !process.env.RESEND_API_KEY || !resend) {
    console.log('Kitchen email not configured - skipping notification');
    return;
  }

  const fulfillmentDate = getFulfillmentDate(order);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BUBA Catering <onboarding@resend.dev>',
      to: process.env.KITCHEN_EMAIL,
      subject: `✓ PAID Order #${order.id} - ${fulfillmentDate}`,
      html: `
        <h2>New Confirmed Order for Production</h2>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Fulfillment Date:</strong> ${fulfillmentDate}</p>
        <p><strong>${order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}:</strong> ${getFulfillmentTimeDisplay(order)}</p>

        <hr/>
        <h3>PRINT THIS SECTION FOR KITCHEN:</h3>
        ${productionSheetHTML}

        <hr/>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin">View Full Production Schedule</a></p>
      `,
    });
    console.log(`Order paid notification sent for order #${order.id}`);
  } catch (error) {
    console.error('Failed to send order paid notification:', error);
  }
}

export function generateProductionSheetHTML(orders: Order[]): string {
  // Group by date
  const ordersByDate: { [date: string]: Order[] } = {};

  orders.forEach(order => {
    const date = getFulfillmentDate(order);
    if (!ordersByDate[date]) {
      ordersByDate[date] = [];
    }
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

    // Calculate totals for the day
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
      html += `<div>${order.fulfillment_type === 'delivery' ? '📦 DELIVERY' : '🏪 PICKUP'}: ${time}</div>`;
      html += `<div>${order.customer_phone}</div>`;
      html += `</div>`;

      if (order.fulfillment_type === 'delivery') {
        html += `<div style="background: #fff3cd; padding: 5px; margin-bottom: 10px;"><strong>Address:</strong> ${order.delivery_address}</div>`;
      }

      order.order_data.items.forEach(item => {
        html += `<div style="margin-left: 15px; border-left: 4px solid #007bff; padding-left: 10px; margin-bottom: 10px;">`;
        html += `<strong>${item.type === 'party_box' ? '🎉 PARTY BOX' : '📦 BIG BOX'}</strong><br/>`;
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
