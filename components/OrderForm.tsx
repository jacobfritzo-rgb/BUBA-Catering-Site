"use client";

import { useState, useEffect } from "react";
import HeroSection from "./HeroSection";
import ProductShowcase from "./ProductShowcase";
import PortionCalculator from "./PortionCalculator";
import EventPhotos from "./EventPhotos";
import FAQ from "./FAQ";
import BoxConfigurator from "./BoxConfigurator";
import AddonsSelector from "./AddonsSelector";
import { Flavor, OrderItem, CreateOrderRequest } from "@/lib/types";
import { isMonOrTue, getMinOrderDate } from "@/lib/utils";

interface Box {
  id: string;
  type: "party_box" | "big_box";
  flavors: string[]; // Array of selected flavor names
}

// Generate time slots from 10:00 to 19:00 in 30-min increments
const TIME_SLOTS: string[] = [];
for (let hour = 10; hour < 19; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
}
TIME_SLOTS.push('19:00');

export default function OrderForm() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [addons, setAddons] = useState<{ [name: string]: number }>({});
  const [addonPrices, setAddonPrices] = useState<{ [name: string]: number }>({});

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [orderDate, setOrderDate] = useState(""); // Used for both pickup and delivery
  const [orderWindowStart, setOrderWindowStart] = useState("14:00");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);

  // Delivery fee is variable - set to 0 in order, admin will quote actual fee
  const DELIVERY_FEE = 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Fetch flavors on mount
  useEffect(() => {
    fetch("/api/flavors")
      .then((res) => res.json())
      .then((data) => setFlavors(data))
      .catch((err) => console.error("Error fetching flavors:", err));
  }, []);

  // Use utility functions from lib/utils.ts

  const addBox = (type: "party_box" | "big_box") => {
    setBoxes([
      ...boxes,
      {
        id: Math.random().toString(36).substring(7),
        type,
        flavors: [],
      },
    ]);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter((box) => box.id !== id));
  };

  const toggleBoxFlavor = (id: string, flavorName: string) => {
    setBoxes(
      boxes.map((box) => {
        if (box.id === id) {
          const isSelected = box.flavors.includes(flavorName);
          return {
            ...box,
            flavors: isSelected
              ? box.flavors.filter((f) => f !== flavorName)
              : [...box.flavors, flavorName],
          };
        }
        return box;
      })
    );
  };

  const updateAddon = (name: string, quantity: number, priceCents: number) => {
    setAddons({
      ...addons,
      [name]: quantity,
    });
    setAddonPrices({
      ...addonPrices,
      [name]: priceCents,
    });
  };

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;

    // Box prices
    boxes.forEach((box) => {
      const price = box.type === "party_box" ? 22500 : 7800;
      total += price;
    });

    // Addon prices
    Object.entries(addons).forEach(([name, quantity]) => {
      const priceCents = addonPrices[name] || 0;
      total += priceCents * quantity;
    });

    // Note: Delivery fee is not added here - will be quoted by admin

    return total;
  };

  // Validate form
  const validateForm = (): string | null => {
    if (boxes.length === 0) {
      return "Please add at least one box to your order";
    }

    // Check each box has correct number of flavors selected
    for (const box of boxes) {
      const flavorCount = box.flavors.length;
      const maxFlavors = box.type === "party_box" ? 3 : 4; // Party: 3, Big: 4
      const boxName = box.type === "party_box" ? "Party Box" : "Big Box";

      if (flavorCount < 1) {
        return "Please select at least 1 flavor for each box";
      }

      if (flavorCount > maxFlavors) {
        return `${boxName} can have at most ${maxFlavors} flavors`;
      }
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return "Please fill in your contact information";
    }

    if (!orderDate) {
      return fulfillmentType === "pickup" ? "Please select a pickup date" : "Please select a delivery date";
    }

    // Note: Removed Mon/Tue blocking - we allow inquiries but show warning

    if (fulfillmentType === "delivery" && !deliveryAddress) {
      return "Please enter a delivery address";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Build order items
      const items: OrderItem[] = boxes.map((box) => {
        // For the new system, all selected flavors get equal quantities
        const piecesPerBox = box.type === "party_box" ? 40 : 8;
        const numFlavors = box.flavors.length;
        const basePieces = Math.floor(piecesPerBox / numFlavors);
        const remainder = piecesPerBox % numFlavors;

        // Distribute pieces evenly, giving extra pieces to first flavors
        const flavorItems = box.flavors.map((name, index) => ({
          name,
          quantity: basePieces + (index < remainder ? 1 : 0)
        }));

        return {
          type: box.type,
          quantity: 1,
          price_cents: box.type === "party_box" ? 22500 : 7800,
          flavors: flavorItems,
        };
      });

      // Build addons
      const addonItems = Object.entries(addons)
        .filter(([_, qty]) => qty > 0)
        .map(([name, quantity]) => {
          return {
            name,
            quantity,
            price_cents: addonPrices[name] || 0,
          };
        });

      // Calculate window end (30 min after start)
      const [hours, minutes] = orderWindowStart.split(':').map(Number);
      const endMinutes = minutes + 30;
      const endHours = endMinutes >= 60 ? hours + 1 : hours;
      const windowEnd = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const orderData: CreateOrderRequest = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        fulfillment_type: fulfillmentType,
        pickup_date: fulfillmentType === "pickup" ? orderDate : undefined,
        pickup_time: fulfillmentType === "pickup" ? orderWindowStart : undefined,
        delivery_date: fulfillmentType === "delivery" ? orderDate : undefined,
        delivery_window_start: fulfillmentType === "delivery" ? orderWindowStart : undefined,
        delivery_window_end: fulfillmentType === "delivery" ? windowEnd : undefined,
        delivery_address: fulfillmentType === "delivery" ? deliveryAddress : undefined,
        delivery_notes: deliveryNotes || undefined,
        delivery_fee: fulfillmentType === "delivery" ? DELIVERY_FEE : 0,
        sms_opt_in: smsOptIn,
        email_opt_in: emailOptIn,
        order_data: {
          items,
          addons: addonItems,
        },
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Order submission failed:", response.status, result);
        setError(result.error || "Failed to submit order");
        return;
      }

      setOrderId(result.id);
      setOrderSuccess(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full border-4 border-[#E10600] p-8 text-center">
          <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-4">REQUEST RECEIVED!</h2>
          <p className="text-black mb-4 font-medium leading-relaxed">
            Thank you for your catering inquiry! We'll review your order and contact you within 24 hours to confirm availability, finalize pricing, and arrange payment.
          </p>
          <div className="bg-gray-100 border-2 border-black p-4 mb-4">
            <p className="text-sm font-bold text-black mb-1">
              ORDER ID: #{orderId}
            </p>
            <p className="text-xs text-black/70">
              Save this for your records
            </p>
          </div>
          <p className="text-xs text-black/60 italic">
            Check your email for confirmation details
          </p>
        </div>
      </div>
    );
  }

  const totalCents = calculateTotal();
  const totalDollars = (totalCents / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection />

      {/* Product Showcase */}
      <ProductShowcase />

      {/* Portion Calculator */}
      <div className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <PortionCalculator />
        </div>
      </div>

      {/* Event Photos */}
      <EventPhotos />

      {/* Order Form Section */}
      <div id="order-form" className="bg-gray-50 py-16 px-4 border-t-4 border-black">
        <div className="max-w-2xl mx-auto">
          {/* Admin Link */}
          <div className="flex justify-end mb-4">
            <a
              href="/admin/login"
              className="text-sm font-black uppercase tracking-wide text-[#E10600] hover:text-white hover:bg-[#E10600] border-2 border-[#E10600] px-4 py-2 transition-colors"
            >
              ADMIN
            </a>
          </div>

          {/* Form Header */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black uppercase tracking-tight text-black mb-4">
              Place Your Order
            </h2>
            <p className="text-sm font-medium uppercase tracking-wide mb-2">
              3 Easy Steps to Fresh Burekas
            </p>
            <p className="text-xs font-medium text-gray-600">
              72 hour advance notice • Confirmation within 24 hours
            </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 1: Choose Boxes */}
          <div className="border-4 border-black bg-white p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black">
                1
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight">Choose Your Boxes</h3>
            </div>

            <p className="text-sm font-medium mb-6 text-gray-700">
              Click a button below to add boxes to your order. You can add as many as you need.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => addBox("party_box")}
                className="relative border-4 border-[#E10600] bg-[#E10600] hover:bg-black text-white font-black py-8 px-6 uppercase tracking-tight transition-colors group"
              >
                <span className="absolute top-2 right-2 text-xs bg-black px-2 py-1">CLICK TO ADD</span>
                <div className="text-xl mb-2">ADD PARTY BOX</div>
                <div className="text-4xl">$225</div>
                <div className="text-xs mt-2 opacity-90">Serves 10-15</div>
              </button>
              <button
                type="button"
                onClick={() => addBox("big_box")}
                className="relative border-4 border-[#E10600] bg-[#E10600] hover:bg-black text-white font-black py-8 px-6 uppercase tracking-tight transition-colors group"
              >
                <span className="absolute top-2 right-2 text-xs bg-black px-2 py-1">CLICK TO ADD</span>
                <div className="text-xl mb-2">ADD BIG BOX</div>
                <div className="text-4xl">$78</div>
                <div className="text-xs mt-2 opacity-90">Feeds 4-6</div>
              </button>
            </div>

            {boxes.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-600">
                <p className="font-black uppercase text-sm text-green-800">
                  ✓ {boxes.length} box{boxes.length > 1 ? 'es' : ''} added - Continue to Step 2 below
                </p>
              </div>
            )}
          </div>

          {/* STEP 2: Configure Flavors */}
          {boxes.length > 0 && (
            <div className="border-4 border-black bg-white p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black">
                  2
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Select Flavors</h3>
              </div>

              <p className="text-sm font-medium mb-6 text-gray-700">
                Click on flavors below to select them for each box. Party Box: 1-3 flavors • Big Box: 1-4 flavors
              </p>

              <div className="space-y-4">
                {boxes.map((box, index) => (
                  <BoxConfigurator
                    key={box.id}
                    boxIndex={index}
                    type={box.type}
                    flavors={flavors}
                    selectedFlavors={box.flavors}
                    onFlavorToggle={(flavorName) =>
                      toggleBoxFlavor(box.id, flavorName)
                    }
                    onRemove={() => removeBox(box.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {boxes.length > 0 && (
            <AddonsSelector addons={addons} onChange={updateAddon} />
          )}

          {/* STEP 3: Delivery & Contact */}
          {boxes.length > 0 && (
            <div className="border-4 border-black bg-white p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black">
                  3
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">Delivery & Contact Info</h3>
              </div>

              <p className="text-sm font-medium mb-6 text-gray-700">
                Choose pickup or delivery, select your date/time, and enter your contact information.
              </p>
                {/* Fulfillment Type Selection */}
              <div className="mb-6 space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-black cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="pickup"
                    checked={fulfillmentType === "pickup"}
                    onChange={(e) => setFulfillmentType(e.target.value as "pickup" | "delivery")}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-black uppercase tracking-wide text-black">PICKUP</div>
                    <div className="text-sm text-gray-600">Pick up at our store</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 border-black cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="fulfillment"
                    value="delivery"
                    checked={fulfillmentType === "delivery"}
                    onChange={(e) => setFulfillmentType(e.target.value as "pickup" | "delivery")}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-black uppercase tracking-wide text-black">DELIVERY (FEE VARIES)</div>
                    <div className="text-sm text-gray-600">We'll contact you with delivery quote based on location & order size</div>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    {fulfillmentType === "pickup" ? "PICKUP DATE" : "DELIVERY DATE"}
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    min={getMinOrderDate()}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    required
                  />
                  {orderDate && isMonOrTue(orderDate) && (
                    <p className="text-sm text-[#E10600] mt-1 font-bold uppercase bg-yellow-50 border-2 border-[#E10600] p-2">
                      ⚠️ NOTE: We're normally closed Mondays & Tuesdays. We'll review your request and contact you to confirm if we can accommodate this date.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    {fulfillmentType === "pickup" ? "PICKUP TIME" : "DELIVERY WINDOW"}
                  </label>
                  <select
                    value={orderWindowStart}
                    onChange={(e) => setOrderWindowStart(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    required
                  >
                    {TIME_SLOTS.map((time) => {
                      if (fulfillmentType === "pickup") {
                        // For pickup, just show the time
                        return (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        );
                      } else {
                        // For delivery, show the 30-minute window
                        const [hours, minutes] = time.split(':').map(Number);
                        const endMinutes = minutes + 30;
                        const endHours = endMinutes >= 60 ? hours + 1 : hours;
                        const endTime = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
                        return (
                          <option key={time} value={time}>
                            {time} - {endTime}
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>

                {/* Show delivery-specific fields only when delivery is selected */}
                {fulfillmentType === "delivery" && (
                  <>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                        DELIVERY ADDRESS
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                        placeholder="123 Main St, Brooklyn, NY 11201"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                        DELIVERY NOTES (OPTIONAL)
                      </label>
                      <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                        rows={3}
                        placeholder="Any special instructions..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Contact Info Section within Step 3 */}
          {boxes.length > 0 && (
            <div className="mt-6 p-6 bg-gray-50 border-2 border-black">
              <h4 className="text-xl font-black uppercase tracking-tight text-black mb-4">Your Contact Information</h4>
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    NAME
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    PHONE
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2 pt-2 border-t-2 border-black mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      className="w-5 h-5 border-2 border-black"
                    />
                    <span className="text-sm font-bold uppercase tracking-wide text-black">
                      TEXT ME ABOUT FUTURE DROPS
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailOptIn}
                      onChange={(e) => setEmailOptIn(e.target.checked)}
                      className="w-5 h-5 border-2 border-black"
                    />
                    <span className="text-sm font-bold uppercase tracking-wide text-black">
                      EMAIL ME ABOUT FUTURE DROPS
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-white border-4 border-[#E10600] p-4">
              <p className="text-[#E10600] font-black uppercase tracking-wide">{error}</p>
            </div>
          )}

          {/* Order Total & Submit */}
          {boxes.length > 0 && (
            <div className="sticky bottom-0 bg-white pt-4 pb-8 border-t-4 border-[#E10600]">
              <div className="border-4 border-black p-4 mb-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                  <span className="text-sm font-bold uppercase tracking-wide text-gray-600">Subtotal:</span>
                  <span className="text-sm font-bold text-gray-600">
                    ${totalDollars}
                  </span>
                </div>
                {fulfillmentType === "delivery" && (
                  <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Delivery Fee:</span>
                    <span className="text-xs font-bold text-gray-600">
                      TBD*
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                  <span className="text-sm font-bold uppercase tracking-wide text-gray-600">Estimated Tax (8.875%):</span>
                  <span className="text-sm font-bold text-gray-600">
                    ${((parseFloat(totalDollars) * 0.08875).toFixed(2))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black uppercase tracking-tight text-black">ESTIMATED TOTAL:</span>
                  <span className="text-3xl font-black text-[#E10600]">
                    ${(parseFloat(totalDollars) * 1.08875).toFixed(2)}{fulfillmentType === "delivery" ? "*" : ""}
                  </span>
                </div>
                {fulfillmentType === "delivery" && (
                  <p className="text-xs text-gray-600 mt-2 italic">
                    *Delivery fee varies by location and order size. We'll contact you with final total.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="relative w-full bg-[#E10600] hover:bg-black text-white font-black py-8 px-6 uppercase tracking-tight border-4 border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-2xl"
              >
                {isSubmitting ? (
                  "SUBMITTING YOUR ORDER..."
                ) : (
                  <>
                    <span className="absolute top-2 right-4 text-xs bg-white text-black px-2 py-1">CLICK TO SUBMIT</span>
                    SUBMIT CATERING REQUEST
                  </>
                )}
              </button>
            </div>
          )}
        </form>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
}
