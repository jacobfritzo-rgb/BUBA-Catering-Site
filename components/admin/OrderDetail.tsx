"use client";

import { useState, useEffect } from "react";
import { Order, OrderNote } from "@/lib/types";

interface OrderDetailProps {
  order: Order;
  onUpdate: () => void;
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  call: "Called Customer",
  email: "Emailed Customer",
  other: "Other",
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  note: "bg-blue-100 text-blue-800",
  call: "bg-green-100 text-green-800",
  email: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

const METROSPEEDY_STATUSES = [
  { value: "not_submitted", label: "Not Submitted" },
  { value: "submitted", label: "Submitted" },
  { value: "confirmed", label: "Confirmed" },
];

// MetroSpeedy Appendix A fee calculators
function calcBaseDeliveryFee(orderCents: number): number {
  const dollars = orderCents / 100;
  if (dollars <= 500) return 35;
  if (dollars <= 750) return 55;
  if (dollars <= 1000) return 75;
  // Over $1000: $75 + $25 for each $250 increment above $1000
  const increments = Math.ceil((dollars - 1000) / 250);
  return 75 + increments * 25;
}

function calcFuelSurcharge(gasPrice: number): number {
  if (gasPrice < 2.25) return 0.43;
  if (gasPrice < 2.75) return 0.53;
  if (gasPrice < 3.25) return 0.61;
  if (gasPrice < 3.75) return 0.71;
  if (gasPrice < 4.25) return 0.81;
  if (gasPrice < 4.75) return 0.90;
  if (gasPrice < 5.25) return 0.97;
  // $5.25+: $0.97 + $0.20 for every $0.50 above $5.25
  const extraIncrements = Math.ceil((gasPrice - 5.25) / 0.50);
  return parseFloat((0.97 + extraIncrements * 0.20).toFixed(2));
}

export default function OrderDetail({ order, onUpdate }: OrderDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");

  // MetroSpeedy state
  const [metroStatus, setMetroStatus] = useState(order.metrospeedy_status || "not_submitted");
  const [metroNotes, setMetroNotes] = useState(order.metrospeedy_notes || "");
  const [isSavingMetro, setIsSavingMetro] = useState(false);
  const [metroMsg, setMetroMsg] = useState("");

  // MetroSpeedy fee calculator state
  const [showFeeCalc, setShowFeeCalc] = useState(false);
  const [feeCalcMiles, setFeeCalcMiles] = useState(0);
  const [feeCalcGasPrice, setFeeCalcGasPrice] = useState(3.50);
  const [feeCalcSetup, setFeeCalcSetup] = useState(false);
  const [feeCalcWaitMins, setFeeCalcWaitMins] = useState(0);

  // Delivery fee confirm state
  const [isConfirmingFee, setIsConfirmingFee] = useState(false);
  const [feeConfirmMsg, setFeeConfirmMsg] = useState("");

  // Production done state
  const [isMarkingProduction, setIsMarkingProduction] = useState(false);
  const [productionMsg, setProductionMsg] = useState("");

  // Activity log state
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNoteType, setNewNoteType] = useState("note");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [order.id]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/orders/${order.id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch {
      // silently fail
    } finally {
      setNotesLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "rejected") {
      setPendingStatus("rejected");
      setRejectionReason("");
      setShowRejectionModal(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: string, reason?: string) => {
    setIsUpdating(true);
    setMessage("");
    try {
      const body: Record<string, string> = { status: newStatus };
      if (reason !== undefined) body.rejection_reason = reason;

      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage("Status updated");
        onUpdate();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to update status");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const confirmRejection = () => {
    setShowRejectionModal(false);
    updateStatus(pendingStatus, rejectionReason);
  };

  const cancelRejection = () => {
    setShowRejectionModal(false);
    setPendingStatus("");
  };

  const saveMetrospeedy = async () => {
    setIsSavingMetro(true);
    setMetroMsg("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrospeedy_status: metroStatus, metrospeedy_notes: metroNotes }),
      });
      setMetroMsg(res.ok ? "Saved!" : "Failed to save.");
    } catch {
      setMetroMsg("Error saving.");
    } finally {
      setIsSavingMetro(false);
      setTimeout(() => setMetroMsg(""), 3000);
    }
  };

  const addNote = async () => {
    if (!newNoteContent.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_type: newNoteType, content: newNoteContent }),
      });
      if (res.ok) {
        setNewNoteContent("");
        fetchNotes();
      }
    } catch {
      // silently fail
    } finally {
      setIsAddingNote(false);
    }
  };

  const confirmDeliveryFee = async (feeDollars: number) => {
    setIsConfirmingFee(true);
    setFeeConfirmMsg("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_fee: Math.round(feeDollars * 100) }),
      });
      if (res.ok) {
        onUpdate();
        setFeeConfirmMsg(`Confirmed! Fee set to $${feeDollars.toFixed(2)}. Customer notified.`);
      } else {
        setFeeConfirmMsg("Failed to confirm fee.");
      }
    } catch {
      setFeeConfirmMsg("Error confirming fee.");
    } finally {
      setIsConfirmingFee(false);
      setTimeout(() => setFeeConfirmMsg(""), 5000);
    }
  };

  const markProductionDone = async (done: boolean) => {
    setIsMarkingProduction(true);
    setProductionMsg("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ production_done: done ? 1 : 0 }),
      });
      if (res.ok) {
        onUpdate();
        setProductionMsg(done ? "Marked done! Owner notified." : "Reset.");
      } else {
        setProductionMsg("Failed to update.");
      }
    } catch {
      setProductionMsg("Error.");
    } finally {
      setIsMarkingProduction(false);
      setTimeout(() => setProductionMsg(""), 4000);
    }
  };

  const copyToClipboard = () => {
    let text = `BUBA Catering Order #${order.id}\n`;
    text += `Customer: ${order.customer_name} — ${order.customer_email} — ${order.customer_phone}\n\n`;

    order.order_data.items.forEach((item) => {
      const boxType = item.type === "party_box" ? "Party Box" : "Big Box";
      text += `${boxType} x${item.quantity} — $${(item.price_cents / 100).toFixed(2)}\n`;
      item.flavors.forEach((flavor) => {
        text += `  ${flavor.name}: ${flavor.quantity} pcs\n`;
      });
      text += "\n";
    });

    if (order.order_data.addons && order.order_data.addons.length > 0) {
      order.order_data.addons.forEach((addon) => {
        text += `${addon.name} x${addon.quantity} — $${(addon.price_cents / 100).toFixed(2)}\n`;
      });
      text += "\n";
    }

    if (order.fulfillment_type === "delivery") {
      text += `Delivery Fee: $${(order.delivery_fee / 100).toFixed(2)}\n`;
    }
    text += `Total: $${(order.total_price / 100).toFixed(2)}\n\n`;

    if (order.fulfillment_type === "delivery") {
      text += `Delivery: ${new Date(order.delivery_date! + 'T00:00:00').toLocaleDateString()} ${order.delivery_window_start}-${order.delivery_window_end} to ${order.delivery_address}\n`;
      text += `Notes: ${order.delivery_notes || "None"}`;
    } else {
      text += `Pickup: ${new Date(order.pickup_date! + 'T00:00:00').toLocaleDateString()} at ${order.pickup_time}\n`;
      text += `Notes: ${order.delivery_notes || "None"}`;
    }

    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard!");
    setTimeout(() => setMessage(""), 2000);
  };

  const ALL_STATUSES = ["pending", "approved", "rejected", "paid", "completed"];
  const isPaid = order.status === "paid";

  // Derived fee calculator values
  // Use subtotal (total_price minus any existing delivery_fee) so recalculating doesn't inflate the base fee tier
  const orderSubtotal = order.total_price - (order.delivery_fee || 0);
  const feeBaseFee = calcBaseDeliveryFee(orderSubtotal);
  const feeMileageFee = Math.max(0, feeCalcMiles - 2) * 2;
  const feeFuelSurcharge = calcFuelSurcharge(feeCalcGasPrice);
  const feeWaitFee = feeCalcWaitMins > 0 ? Math.ceil(feeCalcWaitMins / 15) * 12.50 : 0;
  const feeSetupFee = feeCalcSetup ? 25 : 0;
  const feeTotalFee = feeBaseFee + feeMileageFee + feeFuelSurcharge + feeWaitFee + feeSetupFee;

  return (
    <div className="space-y-6">
      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tight mb-1">Reject Order #{order.id}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Optionally add a reason. This will be included in the rejection email sent to {order.customer_name}.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. We're fully booked on that date, or the order could not be accommodated due to minimum quantities..."
              rows={4}
              className="w-full px-3 py-2 border-2 border-black text-sm font-medium mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={confirmRejection}
                className="bg-[#E10600] text-white font-black px-5 py-2 uppercase tracking-tight border-2 border-[#E10600] hover:bg-black hover:border-black transition-colors"
              >
                Confirm Rejection
              </button>
              <button
                onClick={cancelRejection}
                className="bg-white text-black font-black px-5 py-2 uppercase tracking-tight border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
          <p className="text-sm text-gray-600">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_email}</p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
          {order.order_data.serves_count && (
            <p className="text-sm text-gray-600 mt-1">
              Serving: <strong>{order.order_data.serves_count} people</strong>
            </p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"} Information
          </h4>
          <p className="text-sm text-gray-600">
            {new Date((order.fulfillment_type === "delivery" ? order.delivery_date! : order.pickup_date!) + 'T00:00:00').toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600">
            {order.fulfillment_type === "delivery"
              ? `${order.delivery_window_start} - ${order.delivery_window_end}`
              : order.pickup_time}
          </p>
          {order.fulfillment_type === "delivery" && order.delivery_address && (
            <p className="text-sm text-gray-600">{order.delivery_address}</p>
          )}
          {order.delivery_notes && (
            <p className="text-sm text-gray-600 mt-2 italic">Notes: {order.delivery_notes}</p>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Items</h4>
        {order.order_data.items.map((item, index) => (
          <div key={index} className="mb-3 p-3 bg-white border border-gray-200 rounded">
            <p className="font-medium text-sm">
              {item.type === "party_box" ? "Party Box" : "Big Box"} x{item.quantity} — $
              {(item.price_cents / 100).toFixed(2)}
            </p>
            <ul className="mt-1 ml-4 text-sm text-gray-600">
              {item.flavors.map((flavor, idx) => (
                <li key={idx}>
                  {flavor.name}: {flavor.quantity} pcs
                </li>
              ))}
            </ul>
          </div>
        ))}

        {order.order_data.addons && order.order_data.addons.length > 0 && (
          <>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Add-ons</h4>
            {order.order_data.addons.map((addon, index) => (
              <div key={index} className="mb-2 p-3 bg-white border border-gray-200 rounded">
                <p className="font-medium text-sm">
                  {addon.name} x{addon.quantity} — ${(addon.price_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Rejection Reason (if rejected) */}
      {order.status === "rejected" && order.rejection_reason && (
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <h4 className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</h4>
          <p className="text-sm text-red-800">{order.rejection_reason}</p>
        </div>
      )}

      {/* Deadlines + Production Done */}
      <div className={isPaid ? "bg-yellow-50 border border-yellow-200 p-4 rounded" : "p-4 border border-gray-200 rounded"}>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Production Deadlines</h4>
        <p className={`text-sm ${isPaid ? "font-bold text-yellow-900" : "text-gray-600"}`}>
          Production Deadline: {new Date(order.production_deadline + 'T00:00:00').toLocaleDateString()}
        </p>
        <p className={`text-sm ${isPaid ? "font-bold text-yellow-900" : "text-gray-600"}`}>
          Bake Deadline: {new Date(order.bake_deadline).toLocaleString()}
        </p>

        {/* Production checklist */}
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3 flex-wrap">
          {order.production_done ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-bold border border-green-300">
                ✅ Production Done
              </span>
              {order.production_done_at && (
                <span className="text-xs text-gray-500">
                  {new Date(order.production_done_at).toLocaleString()}
                </span>
              )}
              <button
                onClick={() => markProductionDone(false)}
                disabled={isMarkingProduction}
                className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
              >
                Undo
              </button>
            </>
          ) : (
            <button
              onClick={() => markProductionDone(true)}
              disabled={isMarkingProduction}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-wide rounded border-2 border-green-600 disabled:opacity-50 transition-colors"
            >
              {isMarkingProduction ? "Saving..." : "✓ Mark Production Done"}
            </button>
          )}
          {productionMsg && (
            <span className={`text-sm font-medium ${productionMsg.includes("Failed") || productionMsg.includes("Error") ? "text-red-600" : "text-green-700"}`}>
              {productionMsg}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Set status:</label>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className="border border-gray-300 rounded px-3 py-2 text-sm font-medium bg-white disabled:opacity-50 cursor-pointer"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={copyToClipboard}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-medium"
        >
          Copy for Toast
        </button>

        {message && (
          <span className={`text-sm ${message.includes("error") || message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </span>
        )}
      </div>

      {/* MetroSpeedy Section (delivery orders only) */}
      {order.fulfillment_type === "delivery" && (
        <div className="border-2 border-orange-200 bg-orange-50 p-4 rounded">
          <h4 className="text-sm font-black uppercase tracking-wide text-orange-900 mb-3">🚚 MetroSpeedy Delivery</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-orange-800 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={metroStatus}
                onChange={(e) => setMetroStatus(e.target.value)}
                className="border-2 border-orange-300 bg-white rounded px-3 py-2 text-sm font-medium w-full"
              >
                {METROSPEEDY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-orange-800 mb-1 uppercase tracking-wide">Notes / Reference #</label>
              <textarea
                value={metroNotes}
                onChange={(e) => setMetroNotes(e.target.value)}
                placeholder="e.g. Confirmation #12345, pickup window 10-11am, driver name John..."
                rows={3}
                className="border-2 border-orange-300 bg-white rounded px-3 py-2 text-sm w-full"
              />
            </div>
            {/* Fee Calculator */}
            <div className="border-t border-orange-200 pt-3">
              <button
                type="button"
                onClick={() => setShowFeeCalc(!showFeeCalc)}
                className="text-sm font-bold text-orange-800 hover:text-orange-900 flex items-center gap-1"
              >
                {showFeeCalc ? "▲" : "▼"} Estimate Delivery Fee (Appendix A)
              </button>

              {showFeeCalc && (
                <div className="mt-3 bg-white border border-orange-200 rounded p-3 space-y-3">
                  {/* Auto-populated order value + base fee */}
                  <div className="text-sm space-y-1 pb-2 border-b border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Subtotal:</span>
                      <span className="font-bold">${(orderSubtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Delivery Fee:</span>
                      <span className="font-bold text-orange-800">${feeBaseFee.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Miles input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Miles from Bleecker St <span className="font-normal text-gray-400">(first 2 free, +$2/mi after)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={feeCalcMiles}
                      onChange={(e) => setFeeCalcMiles(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    {feeMileageFee > 0 && (
                      <p className="text-xs text-orange-700 mt-0.5">+${feeMileageFee.toFixed(2)} ({Math.max(0, feeCalcMiles - 2).toFixed(1)} billable mi)</p>
                    )}
                  </div>

                  {/* Gas price for fuel surcharge */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Avg Gas Price ($/gal) <span className="font-normal text-gray-400">for fuel surcharge</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.05"
                      value={feeCalcGasPrice}
                      onChange={(e) => setFeeCalcGasPrice(parseFloat(e.target.value) || 3.50)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    <p className="text-xs text-orange-700 mt-0.5">Fuel surcharge: +${feeFuelSurcharge.toFixed(2)}</p>
                  </div>

                  {/* Optional: Setup fee */}
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={feeCalcSetup}
                      onChange={(e) => setFeeCalcSetup(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Setup Required <span className="text-gray-500">(+$25.00)</span></span>
                  </label>

                  {/* Optional: Wait time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Wait Time (minutes) <span className="font-normal text-gray-400">$12.50 per 15 min</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={feeCalcWaitMins}
                      onChange={(e) => setFeeCalcWaitMins(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    {feeWaitFee > 0 && (
                      <p className="text-xs text-orange-700 mt-0.5">+${feeWaitFee.toFixed(2)}</p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="border-t-2 border-orange-300 pt-2 space-y-0.5 text-xs text-gray-500">
                    <div className="flex justify-between"><span>Base fee:</span><span>${feeBaseFee.toFixed(2)}</span></div>
                    {feeMileageFee > 0 && <div className="flex justify-between"><span>Mileage:</span><span>+${feeMileageFee.toFixed(2)}</span></div>}
                    <div className="flex justify-between"><span>Fuel surcharge:</span><span>+${feeFuelSurcharge.toFixed(2)}</span></div>
                    {feeSetupFee > 0 && <div className="flex justify-between"><span>Setup fee:</span><span>+$25.00</span></div>}
                    {feeWaitFee > 0 && <div className="flex justify-between"><span>Wait time:</span><span>+${feeWaitFee.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-black text-sm text-orange-900 border-t border-orange-200 pt-1 mt-1">
                      <span>ESTIMATED TOTAL:</span>
                      <span>${feeTotalFee.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Confirm button */}
                  <div className="pt-2 border-t border-orange-200">
                    {order.delivery_fee > 0 && (
                      <p className="text-xs text-orange-700 mb-1.5">
                        Current confirmed fee: <strong>${(order.delivery_fee / 100).toFixed(2)}</strong>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => confirmDeliveryFee(feeTotalFee)}
                      disabled={isConfirmingFee}
                      className="w-full bg-orange-700 hover:bg-orange-800 text-white font-black text-sm py-2 px-3 uppercase tracking-wide border-2 border-orange-700 disabled:opacity-50 transition-colors"
                    >
                      {isConfirmingFee ? "Confirming..." : `✓ Confirm $${feeTotalFee.toFixed(2)} Delivery Fee`}
                    </button>
                    {feeConfirmMsg && (
                      <p className={`text-xs mt-1.5 font-medium ${feeConfirmMsg.includes("Failed") || feeConfirmMsg.includes("Error") ? "text-red-600" : "text-green-700"}`}>
                        {feeConfirmMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveMetrospeedy}
                disabled={isSavingMetro}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-black uppercase tracking-wide disabled:opacity-50"
              >
                {isSavingMetro ? "Saving..." : "Save"}
              </button>
              {metroMsg && (
                <span className={`text-sm font-medium ${metroMsg === "Saved!" ? "text-green-700" : "text-red-600"}`}>
                  {metroMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="border-2 border-gray-200 rounded">
        <div className="bg-gray-50 border-b-2 border-gray-200 px-4 py-3">
          <h4 className="text-sm font-black uppercase tracking-wide text-gray-700">Activity Log</h4>
        </div>

        {/* Add Note Form */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 mb-2">
            <select
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a note, log a call, record what was discussed..."
              rows={2}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote(); }}
            />
            <button
              onClick={addNote}
              disabled={isAddingNote || !newNoteContent.trim()}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded text-sm font-black uppercase tracking-wide self-end disabled:opacity-40"
            >
              {isAddingNote ? "..." : "Add"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">⌘ + Enter to submit</p>
        </div>

        {/* Notes List */}
        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {notesLoading ? (
            <p className="text-sm text-gray-400 p-4">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 italic">No activity logged yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-3 flex gap-3">
                <div className="shrink-0 pt-0.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.other}`}>
                    {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
