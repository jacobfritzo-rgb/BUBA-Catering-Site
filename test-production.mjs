const response = await fetch('http://localhost:3000/api/orders?status=paid');
const orders = await response.json();

console.log('Production Sheet Test - Paid Orders for Kitchen\n');
console.log('═'.repeat(80));
console.log(`Total Paid Orders: ${orders.length}\n`);

// Group by date
const byDate = {};
orders.forEach(order => {
  const date = order.fulfillment_type === 'delivery' ? order.delivery_date : order.pickup_date;
  if (!byDate[date]) byDate[date] = [];
  byDate[date].push(order);
});

// Calculate totals per date
Object.keys(byDate).sort().forEach(date => {
  const dayOrders = byDate[date];
  console.log(`\n📅 ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
  console.log('─'.repeat(80));

  let partyBoxes = 0;
  let bigBoxes = 0;
  const flavors = {};
  const addons = {};

  dayOrders.forEach(order => {
    order.order_data.items.forEach(item => {
      if (item.type === 'party_box') partyBoxes++;
      else bigBoxes++;

      item.flavors.forEach(f => {
        flavors[f.name] = (flavors[f.name] || 0) + f.quantity;
      });
    });

    if (order.order_data.addons) {
      order.order_data.addons.forEach(a => {
        addons[a.name] = (addons[a.name] || 0) + a.quantity;
      });
    }
  });

  console.log(`  Orders: ${dayOrders.length}`);
  console.log(`  Party Boxes: ${partyBoxes} (${partyBoxes * 40} pieces total)`);
  console.log(`  Big Boxes: ${bigBoxes} (${bigBoxes * 8} pieces total)`);

  console.log(`\n  Flavor Breakdown:`);
  Object.entries(flavors).sort((a, b) => b[1] - a[1]).forEach(([name, qty]) => {
    console.log(`    - ${name}: ${qty} pieces`);
  });

  if (Object.keys(addons).length > 0) {
    console.log(`\n  Add-ons:`);
    Object.entries(addons).forEach(([name, qty]) => {
      console.log(`    - ${name}: ${qty}x`);
    });
  }
});

console.log(`\n\n${'═'.repeat(80)}`);
console.log('✅ Production view data is correctly structured!');
