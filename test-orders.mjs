// Test script to create 20 diverse orders
const baseUrl = 'http://localhost:3000';

const flavors = ['Cheese', 'Spinach Artichoke', 'Potato Leek', 'Seasonal'];

const testOrders = [
  // Test 1: Single Party Box, Pickup, Near Future
  {
    customer_name: 'Sarah Johnson',
    customer_email: 'sarah.johnson@email.com',
    customer_phone: '555-0101',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-19',
    pickup_time: '10:00 AM',
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Cheese', quantity: 20 },
          { name: 'Spinach Artichoke', quantity: 20 }
        ]
      }],
      addons: []
    }
  },

  // Test 2: Multiple Party Boxes, Delivery, Weekend
  {
    customer_name: 'Michael Chen',
    customer_email: 'mchen@company.com',
    customer_phone: '555-0102',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-21',
    delivery_window_start: '2:00 PM',
    delivery_window_end: '4:00 PM',
    delivery_address: '123 Main Street, Brooklyn, NY 11201',
    delivery_notes: 'Ring doorbell twice',
    delivery_fee: 1500,
    sms_opt_in: false,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 15 },
            { name: 'Potato Leek', quantity: 25 }
          ]
        },
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Spinach Artichoke', quantity: 30 },
            { name: 'Seasonal', quantity: 10 }
          ]
        }
      ],
      addons: [{ name: 'Napkins', quantity: 2, price_cents: 0 }]
    }
  },

  // Test 3: Big Box only, Pickup, Early morning
  {
    customer_name: 'Emily Rodriguez',
    customer_email: 'emily.r@gmail.com',
    customer_phone: '555-0103',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-20',
    pickup_time: '8:00 AM',
    sms_opt_in: true,
    email_opt_in: false,
    order_data: {
      items: [{
        type: 'big_box',
        quantity: 1,
        price_cents: 7800,
        flavors: [
          { name: 'Cheese', quantity: 4 },
          { name: 'Spinach Artichoke', quantity: 4 }
        ]
      }],
      addons: []
    }
  },

  // Test 4: Mix of Party and Big Boxes, Delivery
  {
    customer_name: 'David Kim',
    customer_email: 'dkim@startup.io',
    customer_phone: '555-0104',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-22',
    delivery_window_start: '12:00 PM',
    delivery_window_end: '2:00 PM',
    delivery_address: '456 Tech Ave, Manhattan, NY 10001',
    delivery_fee: 2000,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 40 }
          ]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [
            { name: 'Potato Leek', quantity: 8 }
          ]
        }
      ],
      addons: [
        { name: 'Plates', quantity: 1, price_cents: 0 },
        { name: 'Utensils', quantity: 1, price_cents: 0 }
      ]
    }
  },

  // Test 5: Large catering order - multiple party boxes
  {
    customer_name: 'Corporate Events Inc',
    customer_email: 'events@corporate.com',
    customer_phone: '555-0105',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-25',
    delivery_window_start: '11:00 AM',
    delivery_window_end: '1:00 PM',
    delivery_address: '789 Business Blvd, Queens, NY 11101',
    delivery_notes: 'Deliver to reception desk, ask for Janet',
    delivery_fee: 2500,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 20 },
            { name: 'Spinach Artichoke', quantity: 20 }
          ]
        },
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Potato Leek', quantity: 25 },
            { name: 'Seasonal', quantity: 15 }
          ]
        },
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 30 },
            { name: 'Potato Leek', quantity: 10 }
          ]
        }
      ],
      addons: [
        { name: 'Napkins', quantity: 3, price_cents: 0 },
        { name: 'Plates', quantity: 2, price_cents: 0 }
      ]
    }
  },

  // Test 6: Monday order (should show warning)
  {
    customer_name: 'Jennifer Martinez',
    customer_email: 'jmartinez@email.com',
    customer_phone: '555-0106',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-23',
    pickup_time: '3:00 PM',
    sms_opt_in: false,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'big_box',
        quantity: 1,
        price_cents: 7800,
        flavors: [
          { name: 'Spinach Artichoke', quantity: 5 },
          { name: 'Cheese', quantity: 3 }
        ]
      }],
      addons: []
    }
  },

  // Test 7: Tuesday order (should show warning)
  {
    customer_name: 'Robert Taylor',
    customer_email: 'rtaylor@mail.com',
    customer_phone: '555-0107',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-24',
    delivery_window_start: '5:00 PM',
    delivery_window_end: '7:00 PM',
    delivery_address: '321 Park Place, Bronx, NY 10451',
    delivery_fee: 1800,
    sms_opt_in: true,
    email_opt_in: false,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Seasonal', quantity: 40 }
        ]
      }],
      addons: [{ name: 'Utensils', quantity: 1, price_cents: 0 }]
    }
  },

  // Test 8: Same day pickup (far future)
  {
    customer_name: 'Lisa Anderson',
    customer_email: 'landerson@email.com',
    customer_phone: '555-0108',
    fulfillment_type: 'pickup',
    pickup_date: '2026-03-01',
    pickup_time: '12:00 PM',
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [
            { name: 'Cheese', quantity: 6 },
            { name: 'Potato Leek', quantity: 2 }
          ]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [
            { name: 'Spinach Artichoke', quantity: 8 }
          ]
        }
      ],
      addons: []
    }
  },

  // Test 9: Evening delivery
  {
    customer_name: 'James Wilson',
    customer_email: 'jwilson@company.net',
    customer_phone: '555-0109',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-26',
    delivery_window_start: '6:00 PM',
    delivery_window_end: '8:00 PM',
    delivery_address: '654 Sunset Ave, Staten Island, NY 10301',
    delivery_notes: 'Call on arrival',
    delivery_fee: 3000,
    sms_opt_in: false,
    email_opt_in: false,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Cheese', quantity: 10 },
          { name: 'Spinach Artichoke', quantity: 10 },
          { name: 'Potato Leek', quantity: 10 },
          { name: 'Seasonal', quantity: 10 }
        ]
      }],
      addons: [
        { name: 'Napkins', quantity: 1, price_cents: 0 },
        { name: 'Plates', quantity: 1, price_cents: 0 },
        { name: 'Utensils', quantity: 1, price_cents: 0 }
      ]
    }
  },

  // Test 10: Multiple big boxes
  {
    customer_name: 'Amanda Brown',
    customer_email: 'abrown@email.com',
    customer_phone: '555-0110',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-27',
    pickup_time: '1:00 PM',
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [{ name: 'Cheese', quantity: 8 }]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [{ name: 'Spinach Artichoke', quantity: 8 }]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [{ name: 'Potato Leek', quantity: 8 }]
        }
      ],
      addons: []
    }
  },

  // Test 11: Weekend delivery
  {
    customer_name: 'Christopher Lee',
    customer_email: 'clee@mail.com',
    customer_phone: '555-0111',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-28',
    delivery_window_start: '10:00 AM',
    delivery_window_end: '12:00 PM',
    delivery_address: '987 Weekend Dr, Brooklyn, NY 11215',
    delivery_fee: 1500,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Potato Leek', quantity: 35 },
          { name: 'Seasonal', quantity: 5 }
        ]
      }],
      addons: [{ name: 'Napkins', quantity: 2, price_cents: 0 }]
    }
  },

  // Test 12: Early pickup
  {
    customer_name: 'Michelle Garcia',
    customer_email: 'mgarcia@email.com',
    customer_phone: '555-0112',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-19',
    pickup_time: '7:00 AM',
    sms_opt_in: false,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'big_box',
        quantity: 1,
        price_cents: 7800,
        flavors: [
          { name: 'Cheese', quantity: 4 },
          { name: 'Seasonal', quantity: 4 }
        ]
      }],
      addons: []
    }
  },

  // Test 13: Large mixed order
  {
    customer_name: 'Thomas White',
    customer_email: 'twhite@business.com',
    customer_phone: '555-0113',
    fulfillment_type: 'delivery',
    delivery_date: '2026-03-02',
    delivery_window_start: '1:00 PM',
    delivery_window_end: '3:00 PM',
    delivery_address: '147 Commerce St, Manhattan, NY 10014',
    delivery_notes: 'Leave with doorman',
    delivery_fee: 2200,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 25 },
            { name: 'Spinach Artichoke', quantity: 15 }
          ]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [
            { name: 'Potato Leek', quantity: 5 },
            { name: 'Seasonal', quantity: 3 }
          ]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [{ name: 'Cheese', quantity: 8 }]
        }
      ],
      addons: [
        { name: 'Plates', quantity: 2, price_cents: 0 },
        { name: 'Utensils', quantity: 2, price_cents: 0 }
      ]
    }
  },

  // Test 14: Simple single flavor party box
  {
    customer_name: 'Karen Thompson',
    customer_email: 'kthompson@email.com',
    customer_phone: '555-0114',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-20',
    pickup_time: '4:00 PM',
    sms_opt_in: true,
    email_opt_in: false,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [{ name: 'Spinach Artichoke', quantity: 40 }]
      }],
      addons: []
    }
  },

  // Test 15: Afternoon delivery
  {
    customer_name: 'Daniel Martinez',
    customer_email: 'dmartinez@company.org',
    customer_phone: '555-0115',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-21',
    delivery_window_start: '3:00 PM',
    delivery_window_end: '5:00 PM',
    delivery_address: '258 Spring St, Manhattan, NY 10013',
    delivery_fee: 1700,
    sms_opt_in: false,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Cheese', quantity: 20 },
          { name: 'Potato Leek', quantity: 20 }
        ]
      }],
      addons: [{ name: 'Napkins', quantity: 1, price_cents: 0 }]
    }
  },

  // Test 16: Multiple party boxes same flavors
  {
    customer_name: 'Nancy Harris',
    customer_email: 'nharris@mail.com',
    customer_phone: '555-0116',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-26',
    pickup_time: '11:00 AM',
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [{ name: 'Cheese', quantity: 40 }]
        },
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [{ name: 'Cheese', quantity: 40 }]
        }
      ],
      addons: []
    }
  },

  // Test 17: Late afternoon pickup
  {
    customer_name: 'Paul Robinson',
    customer_email: 'probinson@email.com',
    customer_phone: '555-0117',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-22',
    pickup_time: '5:00 PM',
    sms_opt_in: false,
    email_opt_in: false,
    order_data: {
      items: [{
        type: 'big_box',
        quantity: 1,
        price_cents: 7800,
        flavors: [
          { name: 'Spinach Artichoke', quantity: 6 },
          { name: 'Potato Leek', quantity: 2 }
        ]
      }],
      addons: []
    }
  },

  // Test 18: Early week delivery
  {
    customer_name: 'Laura Clark',
    customer_email: 'lclark@business.net',
    customer_phone: '555-0118',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-19',
    delivery_window_start: '9:00 AM',
    delivery_window_end: '11:00 AM',
    delivery_address: '369 Hudson St, Manhattan, NY 10014',
    delivery_notes: 'Ring apt 4B',
    delivery_fee: 1600,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'party_box',
        quantity: 1,
        price_cents: 22500,
        flavors: [
          { name: 'Seasonal', quantity: 30 },
          { name: 'Cheese', quantity: 10 }
        ]
      }],
      addons: [
        { name: 'Plates', quantity: 1, price_cents: 0 },
        { name: 'Utensils', quantity: 1, price_cents: 0 }
      ]
    }
  },

  // Test 19: Mixed boxes with all addons
  {
    customer_name: 'Steven Lewis',
    customer_email: 'slewis@company.com',
    customer_phone: '555-0119',
    fulfillment_type: 'delivery',
    delivery_date: '2026-02-27',
    delivery_window_start: '4:00 PM',
    delivery_window_end: '6:00 PM',
    delivery_address: '741 Madison Ave, Manhattan, NY 10065',
    delivery_fee: 2800,
    sms_opt_in: true,
    email_opt_in: true,
    order_data: {
      items: [
        {
          type: 'party_box',
          quantity: 1,
          price_cents: 22500,
          flavors: [
            { name: 'Cheese', quantity: 15 },
            { name: 'Spinach Artichoke', quantity: 15 },
            { name: 'Potato Leek', quantity: 10 }
          ]
        },
        {
          type: 'big_box',
          quantity: 1,
          price_cents: 7800,
          flavors: [
            { name: 'Seasonal', quantity: 8 }
          ]
        }
      ],
      addons: [
        { name: 'Napkins', quantity: 2, price_cents: 0 },
        { name: 'Plates', quantity: 2, price_cents: 0 },
        { name: 'Utensils', quantity: 2, price_cents: 0 }
      ]
    }
  },

  // Test 20: Simple big box pickup
  {
    customer_name: 'Betty Walker',
    customer_email: 'bwalker@email.com',
    customer_phone: '555-0120',
    fulfillment_type: 'pickup',
    pickup_date: '2026-02-28',
    pickup_time: '2:00 PM',
    sms_opt_in: false,
    email_opt_in: true,
    order_data: {
      items: [{
        type: 'big_box',
        quantity: 1,
        price_cents: 7800,
        flavors: [
          { name: 'Potato Leek', quantity: 8 }
        ]
      }],
      addons: []
    }
  }
];

async function submitOrder(orderData) {
  try {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Failed to submit order for ${orderData.customer_name}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('Starting to submit 20 test orders...\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testOrders.length; i++) {
    const order = testOrders[i];
    console.log(`[${i + 1}/20] Submitting order for ${order.customer_name}...`);

    const result = await submitOrder(order);

    if (result) {
      successCount++;
      console.log(`  ✓ Success - Order #${result.id} created`);
    } else {
      failCount++;
      console.log(`  ✗ Failed`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n========================================`);
  console.log(`Test Results:`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`========================================`);
}

runTests().catch(console.error);
