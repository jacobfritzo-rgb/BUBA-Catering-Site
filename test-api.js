// Simple API test script
// Run this with: node test-api.js

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing BUBA Catering API...\n');

  try {
    // Test 1: Get flavors
    console.log('1️⃣ Testing GET /api/flavors');
    const flavorsRes = await fetch(`${BASE_URL}/flavors`);
    const flavors = await flavorsRes.json();
    console.log('✅ Flavors:', flavors.map(f => f.name).join(', '));
    console.log('');

    // Test 2: Create an order
    console.log('2️⃣ Testing POST /api/orders');

    // Calculate a delivery date 4 days from now (avoiding Mon/Tue)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);

    // If it lands on Monday (1) or Tuesday (2), push to Wednesday
    while (deliveryDate.getDay() === 1 || deliveryDate.getDay() === 2) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    const orderData = {
      customer_name: "Test Customer",
      customer_email: "test@example.com",
      customer_phone: "555-0123",
      delivery_date: deliveryDate.toISOString().split('T')[0],
      delivery_window_start: "14:00",
      delivery_window_end: "14:30",
      delivery_address: "123 Test St, Brooklyn, NY 11201",
      delivery_notes: "Please ring doorbell",
      sms_opt_in: true,
      email_opt_in: true,
      order_data: {
        items: [
          {
            type: "party_box",
            quantity: 1,
            price_cents: 22500,
            flavors: [
              { name: "Cheese", quantity: 5 },
              { name: "Potato Leek", quantity: 10 }
            ]
          }
        ],
        addons: [
          { name: "4 Jammy Eggs", quantity: 1, price_cents: 350 }
        ]
      }
    };

    const createRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const created = await createRes.json();
    if (createRes.ok) {
      console.log('✅ Order created with ID:', created.id);
      console.log('');

      // Test 3: Get the order we just created
      console.log('3️⃣ Testing GET /api/orders/' + created.id);
      const getRes = await fetch(`${BASE_URL}/orders/${created.id}`);
      const order = await getRes.json();
      console.log('✅ Retrieved order:', {
        id: order.id,
        customer: order.customer_name,
        status: order.status,
        total: `$${(order.total_price / 100).toFixed(2)}`
      });
      console.log('');

      // Test 4: Update order status
      console.log('4️⃣ Testing PATCH /api/orders/' + created.id);
      const updateRes = await fetch(`${BASE_URL}/orders/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      const updated = await updateRes.json();
      console.log('✅ Order status updated to:', updated.status);
      console.log('');

      // Test 5: Get all orders
      console.log('5️⃣ Testing GET /api/orders');
      const allOrdersRes = await fetch(`${BASE_URL}/orders`);
      const allOrders = await allOrdersRes.json();
      console.log('✅ Total orders in database:', allOrders.length);
      console.log('');

    } else {
      console.log('❌ Error creating order:', created.error);
    }

    console.log('🎉 All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check that all tests passed (✅)');
    console.log('   2. Let the developer know Phase 1 is working');
    console.log('   3. Move on to Phase 2 when ready');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n⚠️  Make sure:');
    console.log('   1. You filled in .env.local with your Turso credentials');
    console.log('   2. The dev server is running (npm run dev)');
    console.log('   3. The server is accessible at http://localhost:3000');
  }
}

testAPI();
