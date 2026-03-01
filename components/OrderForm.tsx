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
  flavors: string[];
}

// Generate time slots from 10:00 to 19:00 in 30-min increments
const TIME_SLOTS: string[] = [];
for (let hour = 10; hour < 19; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:30`);
}
TIME_SLOTS.push("19:00");

export default function OrderForm() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [addons, setAddons] = useState<{ [name: string]: number }>({});
  const [addonPrices, setAddonPrices] = useState<{ [name: string]: number }>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [orderDate, setOrderDate] = useState("");
  const [orderWindowStart, setOrderWindowStart] = useState("14:00");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [servesCount, setServesCount] = useState<number | "">("");

  const DELIVERY_FEE = 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/flavors")
      .then((res) => res.json())
      .then((data) => setFlavors(data))
      .catch((err) => console.error("Error fetching flavors:", err));
  }, []);

  // ─── Box / Flavor management ───────────────────────────────────────────────

  const addBox = (type: "party_box" | "big_box") => {
    setBoxes((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), type, flavors: [] },
    ]);
  };

  const removeBox = (id: string) => {
    setBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const toggleBoxFlavor = (id: string, flavorName: string) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;
        const isSelected = box.flavors.includes(flavorName);
        return {
          ...box,
          flavors: isSelected
            ? box.flavors.filter((f) => f !== flavorName)
            : [...box.flavors, flavorName],
        };
      })
    );
  };

  const updateAddon = (name: string, quantity: number, priceCents: number) => {
    setAddons((prev) => ({ ...prev, [name]: quantity }));
    setAddonPrices((prev) => ({ ...prev, [name]: priceCents }));
  };

  // Called by the Portion Calculator "Add to My Order" buttons
  const handleAddFromCalculator = (partyBoxes: number, bigBoxes: number) => {
    const newBoxes: Box[] = [];
    for (let i = 0; i < partyBoxes; i++) {
      newBoxes.push({ id: Math.random().toString(36).substring(7), type: "party_box", flavors: [] });
    }
    for (let i = 0; i < bigBoxes; i++) {
      newBoxes.push({ id: Math.random().toString(36).substring(7), type: "big_box", flavors: [] });
    }
    setBoxes((prev) => [...prev, ...newBoxes]);
    // If already past step 2, pull back so they can review their boxes
    if (step === 3) setStep(2);
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Pricing ───────────────────────────────────────────────────────────────

  const calculateTotal = () => {
    let total = boxes.reduce((sum, box) => sum + (box.type === "party_box" ? 22500 : 7800), 0);
    Object.entries(addons).forEach(([name, quantity]) => {
      total += (addonPrices[name] || 0) * quantity;
    });
    return total;
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = (): string | null => {
    if (!orderDate) return "Please select a date for your event";
    if (fulfillmentType === "delivery" && !deliveryAddress)
      return "Please enter your delivery address";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (boxes.length === 0) return "Please add at least one box to your order";
    for (const box of boxes) {
      if (box.flavors.length < 1) return "Please select at least 1 flavor for each box";
      const maxFlavors = box.type === "party_box" ? 3 : 4;
      if (box.flavors.length > maxFlavors) {
        const boxName = box.type === "party_box" ? "Party Box" : "Big Box";
        return `${boxName} can have at most ${maxFlavors} flavors`;
      }
    }
    return null;
  };

  const validateForm = (): string | null => {
    const s1 = validateStep1();
    if (s1) return s1;
    const s2 = validateStep2();
    if (s2) return s2;
    if (!customerName || !customerEmail || !customerPhone)
      return "Please fill in your contact information";
    if (fulfillmentType === "delivery" && !deliveryAddress)
      return "Please enter a delivery address";
    return null;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

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
      const items: OrderItem[] = boxes.map((box) => {
        const piecesPerBox = box.type === "party_box" ? 40 : 8;
        const numFlavors = box.flavors.length;
        const basePieces = Math.floor(piecesPerBox / numFlavors);
        const remainder = piecesPerBox % numFlavors;

        const flavorItems = box.flavors.map((name, index) => ({
          name,
          quantity: basePieces + (index < remainder ? 1 : 0),
        }));

        return {
          type: box.type,
          quantity: 1,
          price_cents: box.type === "party_box" ? 22500 : 7800,
          flavors: flavorItems,
        };
      });

      const addonItems = Object.entries(addons)
        .filter(([_, qty]) => qty > 0)
        .map(([name, quantity]) => ({
          name,
          quantity,
          price_cents: addonPrices[name] || 0,
        }));

      const [hours, minutes] = orderWindowStart.split(":").map(Number);
      const endMinutes = minutes + 30;
      const endHours = endMinutes >= 60 ? hours + 1 : hours;
      const windowEnd = `${endHours.toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

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
        order_data: { items, addons: addonItems, serves_count: servesCount || undefined },
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
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

  // ─── Success screen ─────────────────────────────────────────────────────────

  if (orderSuccess) {
    const successDate = orderDate
      ? new Date(orderDate + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        })
      : "";
    const successParty = boxes.filter((b) => b.type === "party_box").length;
    const successBig = boxes.filter((b) => b.type === "big_box").length;
    const successBoxLine = [
      successParty > 0 ? `${successParty} Party Box${successParty > 1 ? "es" : ""}` : "",
      successBig > 0 ? `${successBig} Big Box${successBig > 1 ? "es" : ""}` : "",
    ].filter(Boolean).join(" + ");
    const successSubtotal = (calculateTotal() / 100).toFixed(2);

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full border-4 border-[#E10600] p-8 text-center">
          <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-4">
            REQUEST RECEIVED!
          </h2>
          <p className="text-black mb-4 font-medium leading-relaxed">
            Thank you for your catering inquiry! We&apos;ll review your order and contact you
            within 24 hours to confirm availability, finalize pricing, and arrange payment.
          </p>
          <div className="bg-gray-100 border-2 border-black p-4 mb-4 text-left space-y-1">
            <p className="text-sm font-bold text-black">ORDER ID: #{orderId}</p>
            <p className="text-xs text-black/70">
              {fulfillmentType === "pickup" ? "Pickup" : "Delivery"} · {successDate} · {orderWindowStart}
            </p>
            {successBoxLine && (
              <p className="text-xs text-black/70">{successBoxLine}</p>
            )}
            <p className="text-xs text-black/70">Subtotal: ${successSubtotal} (excl. tax &amp; delivery)</p>
          </div>
          <p className="text-xs text-black/60 italic">
            Check your email for confirmation details
          </p>
        </div>
      </div>
    );
  }

  // ─── Helpers for display ────────────────────────────────────────────────────

  const totalCents = calculateTotal();
  const totalDollars = (totalCents / 100).toFixed(2);

  const partyBoxCount = boxes.filter((b) => b.type === "party_box").length;
  const bigBoxCount = boxes.filter((b) => b.type === "big_box").length;

  const step1Summary = orderDate
    ? `${fulfillmentType === "pickup" ? "Pickup" : "Delivery"} · ${new Date(
        orderDate + "T00:00:00"
      ).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${orderWindowStart}`
    : null;

  const step2Summary =
    boxes.length > 0
      ? [
          partyBoxCount > 0 ? `${partyBoxCount} Party Box${partyBoxCount > 1 ? "es" : ""}` : "",
          bigBoxCount > 0 ? `${bigBoxCount} Big Box${bigBoxCount > 1 ? "es" : ""}` : "",
        ]
          .filter(Boolean)
          .join(" + ")
      : null;

  // ─── Step progress indicator ────────────────────────────────────────────────

  const steps = [
    { n: 1, label: "Event Details" },
    { n: 2, label: "Your Order" },
    { n: 3, label: "Contact Info" },
  ];

  const StepProgress = () => (
    <div className="flex items-center justify-center mb-10">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 flex items-center justify-center font-black text-lg border-4 transition-colors ${
                step > n
                  ? "bg-[#E10600] border-black text-white"
                  : step === n
                  ? "bg-black border-black text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {step > n ? "✓" : n}
            </div>
            <span
              className={`text-xs font-bold uppercase mt-1 tracking-wide hidden sm:block ${
                step === n ? "text-black" : step > n ? "text-[#E10600]" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 sm:w-20 h-1 mx-1 mb-4 transition-colors ${
                step > n ? "bg-[#E10600]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // ─── Summary card (shown at top of later steps) ─────────────────────────────

  const SummaryCard = ({
    label,
    value,
    onEdit,
  }: {
    label: string;
    value: string;
    onEdit: () => void;
  }) => (
    <div className="flex items-center justify-between bg-green-50 border-2 border-green-600 px-4 py-3 mb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">{label}</p>
        <p className="text-sm font-bold text-black">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-black uppercase text-[#E10600] hover:underline"
      >
        EDIT
      </button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection />

      {/* Product Showcase */}
      <ProductShowcase />

      {/* Portion Calculator — wired to cart */}
      <div className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <PortionCalculator onAddToOrder={handleAddFromCalculator} />
        </div>
      </div>

      {/* Event Photos */}
      <EventPhotos />

      {/* Admin Link — intentionally subtle */}
      <a
        href="/admin/login"
        className="fixed bottom-4 right-4 text-xs text-gray-400 hover:text-gray-600 z-50"
      >
        Admin
      </a>

      {/* Order Form Section */}
      <div id="order-form" className="bg-gray-50 py-16 px-4 border-t-4 border-black">
        <div className="max-w-2xl mx-auto">

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

          {/* Step Progress */}
          <StepProgress />

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── STEP 1: Event Details ── */}
            {step === 1 && (
              <div className="border-4 border-black bg-white p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black flex-shrink-0">
                    1
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight">Event Details</h3>
                </div>

                <p className="text-sm font-medium mb-6 text-gray-700">
                  Tell us when and how you&apos;d like your burekas.
                </p>

                {/* Fulfillment type */}
                <div className="mb-6 space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 border-black cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="fulfillment"
                      value="pickup"
                      checked={fulfillmentType === "pickup"}
                      onChange={() => setFulfillmentType("pickup")}
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
                      onChange={() => setFulfillmentType("delivery")}
                      className="w-5 h-5"
                    />
                    <div>
                      <div className="font-black uppercase tracking-wide text-black">
                        DELIVERY (FEE VARIES)
                      </div>
                      <div className="text-sm text-gray-600">
                        We&apos;ll contact you with a delivery quote
                      </div>
                    </div>
                  </label>
                </div>

                {/* Date */}
                <div className="mb-4">
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    {fulfillmentType === "pickup" ? "PICKUP DATE" : "DELIVERY DATE"}
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    min={getMinOrderDate()}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                  />
                  {orderDate && isMonOrTue(orderDate) && (
                    <p className="text-sm text-[#E10600] mt-1 font-bold uppercase bg-yellow-50 border-2 border-[#E10600] p-2">
                      ⚠️ We&apos;re normally closed Mondays & Tuesdays. We&apos;ll confirm if we can
                      accommodate this date.
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="mb-4">
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    {fulfillmentType === "pickup" ? "PICKUP TIME" : "DELIVERY WINDOW"}
                  </label>
                  <select
                    value={orderWindowStart}
                    onChange={(e) => setOrderWindowStart(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                  >
                    {TIME_SLOTS.map((time) => {
                      if (fulfillmentType === "pickup") {
                        return (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        );
                      } else {
                        // Exclude 19:00 for delivery — window end would be 19:30, past closing
                        if (time === "19:00") return null;
                        const [h, m] = time.split(":").map(Number);
                        const em = m + 30;
                        const eh = em >= 60 ? h + 1 : h;
                        const endTime = `${eh.toString().padStart(2, "0")}:${(em % 60).toString().padStart(2, "0")}`;
                        return (
                          <option key={time} value={time}>
                            {time} – {endTime}
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>

                {/* Delivery-specific fields */}
                {fulfillmentType === "delivery" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                        DELIVERY ADDRESS
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                        placeholder="123 Main St, Brooklyn, NY 11201"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                        DELIVERY NOTES (OPTIONAL)
                      </label>
                      <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                        rows={2}
                        placeholder="Buzzer code, leave at door, etc."
                      />
                    </div>
                  </>
                )}

                {/* Number of guests */}
                <div className="mb-4">
                  <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
                    HOW MANY PEOPLE ARE YOU SERVING?
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={servesCount}
                    onChange={(e) => setServesCount(parseInt(e.target.value) || "")}
                    className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
                    placeholder="e.g. 25"
                  />
                </div>

                {/* Step 1 error */}
                {error && (
                  <div className="mb-4 bg-white border-4 border-[#E10600] p-3">
                    <p className="text-[#E10600] font-black uppercase tracking-wide text-sm">{error}</p>
                  </div>
                )}

                {/* Next button */}
                <button
                  type="button"
                  onClick={() => {
                    const err = validateStep1();
                    if (err) {
                      setError(err);
                      return;
                    }
                    setError("");
                    setStep(2);
                    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full bg-[#E10600] hover:bg-black text-white font-black py-5 px-6 uppercase tracking-tight border-4 border-black transition-colors text-xl mt-2"
                >
                  NEXT: BUILD YOUR ORDER →
                </button>
              </div>
            )}

            {/* ── STEP 2: Your Order ── */}
            {step === 2 && (
              <>
                {/* Step 1 summary */}
                {step1Summary && (
                  <SummaryCard
                    label="✓ Event Details"
                    value={step1Summary}
                    onEdit={() => {
                      setError("");
                      setStep(1);
                    }}
                  />
                )}

                {/* Box selection */}
                <div className="border-4 border-black bg-white p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black flex-shrink-0">
                      2
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">
                      Choose Your Boxes
                    </h3>
                  </div>

                  <p className="text-sm font-medium mb-6 text-gray-700">
                    Click to add boxes. You can add as many as you need.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => addBox("party_box")}
                      className="relative border-4 border-[#E10600] bg-[#E10600] hover:bg-black text-white font-black py-8 px-6 uppercase tracking-tight transition-colors"
                    >
                      <span className="absolute top-2 right-2 text-xs bg-black px-2 py-1">
                        CLICK TO ADD
                      </span>
                      <div className="text-xl mb-2">PARTY BOX</div>
                      <div className="text-4xl">$225</div>
                      <div className="text-xs mt-2 opacity-90">Serves 10–15</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBox("big_box")}
                      className="relative border-4 border-[#E10600] bg-[#E10600] hover:bg-black text-white font-black py-8 px-6 uppercase tracking-tight transition-colors"
                    >
                      <span className="absolute top-2 right-2 text-xs bg-black px-2 py-1">
                        CLICK TO ADD
                      </span>
                      <div className="text-xl mb-2">BIG BOX</div>
                      <div className="text-4xl">$78</div>
                      <div className="text-xs mt-2 opacity-90">Feeds 4–6</div>
                    </button>
                  </div>

                  {boxes.length > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border-2 border-green-600">
                      <p className="font-black uppercase text-sm text-green-800">
                        ✓ {boxes.length} box{boxes.length > 1 ? "es" : ""} added — select flavors below
                      </p>
                    </div>
                  )}
                </div>

                {/* Flavor selection */}
                {boxes.length > 0 && (
                  <div className="border-4 border-black bg-white p-6">
                    <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                      Select Flavors
                    </h3>
                    <p className="text-sm font-medium mb-6 text-gray-700">
                      Party Box: 1–3 flavors • Big Box: 1–4 flavors
                    </p>
                    <div className="space-y-4">
                      {boxes.map((box, index) => (
                        <BoxConfigurator
                          key={box.id}
                          boxIndex={index}
                          type={box.type}
                          flavors={flavors}
                          selectedFlavors={box.flavors}
                          onFlavorToggle={(flavorName) => toggleBoxFlavor(box.id, flavorName)}
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

                {/* Step 2 error */}
                {error && (
                  <div className="bg-white border-4 border-[#E10600] p-4">
                    <p className="text-[#E10600] font-black uppercase tracking-wide">{error}</p>
                  </div>
                )}

                {/* Back + Next */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep(1);
                    }}
                    className="flex-1 bg-white hover:bg-gray-100 text-black font-black py-5 px-6 uppercase tracking-tight border-4 border-black transition-colors"
                  >
                    ← BACK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const err = validateStep2();
                      if (err) {
                        setError(err);
                        return;
                      }
                      setError("");
                      setStep(3);
                      document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex-[2] bg-[#E10600] hover:bg-black text-white font-black py-5 px-6 uppercase tracking-tight border-4 border-black transition-colors text-lg"
                  >
                    NEXT: YOUR DETAILS →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Contact Info + Submit ── */}
            {step === 3 && (
              <>
                {/* Steps 1 + 2 summary */}
                {step1Summary && (
                  <SummaryCard
                    label="✓ Event Details"
                    value={step1Summary}
                    onEdit={() => {
                      setError("");
                      setStep(1);
                    }}
                  />
                )}
                {step2Summary && (
                  <SummaryCard
                    label="✓ Your Order"
                    value={`${step2Summary} · $${totalDollars}`}
                    onEdit={() => {
                      setError("");
                      setStep(2);
                    }}
                  />
                )}

                {/* Contact info */}
                <div className="border-4 border-black bg-white p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-[#E10600] text-white font-black text-3xl w-16 h-16 flex items-center justify-center border-4 border-black flex-shrink-0">
                      3
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">Contact Info</h3>
                  </div>

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

                {/* Error */}
                {error && (
                  <div className="bg-white border-4 border-[#E10600] p-4">
                    <p className="text-[#E10600] font-black uppercase tracking-wide">{error}</p>
                  </div>
                )}

                {/* Order Total + Submit */}
                <div className="border-4 border-black bg-white p-4">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                    <span className="text-sm font-bold uppercase tracking-wide text-gray-600">
                      Subtotal:
                    </span>
                    <span className="text-sm font-bold text-gray-600">${totalDollars}</span>
                  </div>
                  {fulfillmentType === "delivery" && (
                    <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                        Delivery Fee:
                      </span>
                      <span className="text-xs font-bold text-gray-600">TBD*</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-200">
                    <span className="text-sm font-bold uppercase tracking-wide text-gray-600">
                      Est. Tax (8.875%):
                    </span>
                    <span className="text-sm font-bold text-gray-600">
                      ${(parseFloat(totalDollars) * 0.08875).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black uppercase tracking-tight text-black">
                      ESTIMATED TOTAL:
                    </span>
                    <span className="text-3xl font-black text-[#E10600]">
                      ${(parseFloat(totalDollars) * 1.08875).toFixed(2)}
                      {fulfillmentType === "delivery" ? "*" : ""}
                    </span>
                  </div>
                  {fulfillmentType === "delivery" && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      *Delivery fee varies by location. We&apos;ll contact you with final total.
                    </p>
                  )}
                </div>

                {/* Back + Submit */}
                <div className="flex gap-4 pb-8">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep(2);
                    }}
                    className="flex-1 bg-white hover:bg-gray-100 text-black font-black py-5 px-6 uppercase tracking-tight border-4 border-black transition-colors"
                  >
                    ← BACK
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] relative bg-[#E10600] hover:bg-black text-white font-black py-5 px-6 uppercase tracking-tight border-4 border-black transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      "SUBMITTING..."
                    ) : (
                      <>
                        <span className="absolute top-2 right-4 text-xs bg-white text-black px-2 py-0.5">
                          CLICK TO SUBMIT
                        </span>
                        SUBMIT CATERING REQUEST
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
}
