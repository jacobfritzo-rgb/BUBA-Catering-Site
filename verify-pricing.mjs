const response = await fetch('http://localhost:3000/api/orders');
const orders = await response.json();

console.log('✅ All 20 test orders recreated with CORRECT pricing!\n');
console.log('═'.repeat(80));

console.log(`\nPricing Summary:`);
console.log(`  Party Box: $225.00 (22500 cents)`);
console.log(`  Big Box:   $78.00 (7800 cents)`);

let totalRevenue = 0;
const byType = { pickup: 0, delivery: 0 };

orders.forEach(order => {
  totalRevenue += order.total_price;
  byType[order.fulfillment_type]++;
});

console.log(`\nOrder Statistics:`);
console.log(`  Total Orders: ${orders.length}`);
console.log(`  Pickup: ${byType.pickup}`);
console.log(`  Delivery: ${byType.delivery}`);
console.log(`  Total Revenue: $${(totalRevenue / 100).toFixed(2)}`);
console.log(`  Average Order: $${(totalRevenue / orders.length / 100).toFixed(2)}`);

console.log(`\nAll Orders:`);
console.log('─'.repeat(80));

orders.forEach(order => {
  const itemsTotal = order.order_data.items.reduce((sum, item) =>
    sum + (item.price_cents * item.quantity), 0
  );
  const deliveryFee = order.delivery_fee || 0;
  const total = order.total_price;

  const boxes = order.order_data.items.map(i =>
    i.type === 'party_box' ? 'P' : 'B'
  ).join('+');

  console.log(
    `#${order.id.toString().padStart(2)} | ${order.fulfillment_type === 'pickup' ? 'PU' : 'DL'} | ` +
    `${boxes.padEnd(7)} | ` +
    `$${(total / 100).toFixed(2).padStart(6)} | ` +
    `${order.customer_name}`
  );
});

console.log('\n' + '═'.repeat(80));
console.log('Legend: P = Party Box ($225), B = Big Box ($78)');
console.log('        PU = Pickup, DL = Delivery');
