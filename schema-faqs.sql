-- FAQ table for admin-configurable questions and answers
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default FAQs
INSERT INTO faqs (question, answer, display_order) VALUES 
('How far in advance do I need to order?', 'We require at least 72 hours (3 days) advance notice for all catering orders. This ensures we have fresh ingredients and enough time to prepare your burekas perfectly. For larger orders or weekend events, we recommend ordering even earlier.', 1),
('What is included with each box?', 'Every box comes with our signature accompaniments: crushed tomato sauce, tahini, spicy schug, pickles, and olives. The Big Box also includes jammy eggs. All sauces and sides are made fresh in-house.', 2),
('Can I mix and match flavors?', 'Absolutely! Party Boxes can have 1-3 flavors, and Big Boxes can have 1-4 flavors. We will divide your box evenly among your selected flavors.', 3),
('Do you deliver?', 'Yes! We deliver to all NYC boroughs. Delivery fee varies based on your location and order size. Select Delivery when placing your order and we will provide a quote when we confirm your order within 24 hours.', 4),
('How does the ordering process work?', 'Submit your catering request through our form, and we will review it within 24 hours. We will confirm availability for your date, finalize pricing (including delivery if applicable), and send you payment instructions. Orders are confirmed once payment is received.', 5);
