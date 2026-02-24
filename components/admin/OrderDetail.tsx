"use client";

import { useState } from "react";
import { Order } from "@/lib/types";

interface OrderDetailProps {
  order: Order;
  onUpdate: () => void;
}

export default function OrderDetail({ order, onUpdate }: OrderDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    setMessage("");

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setMessage("Status updated successfully");
        onUpdate();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to update status");
      }
    } catch (error) {
      setMessage("Network error");
    } finally {
      setIsUpdating(false);
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
      text += `Delivery: ${new Date(order.delivery_date!).toLocaleDateString()} ${order.delivery_window_start}-${order.delivery_window_end} to ${order.delivery_address}\n`;
      text += `Notes: ${order.delivery_notes || "None"}`;
    } else {
      text += `Pickup: ${new Date(order.pickup_date!).toLocaleDateString()} at ${order.pickup_time}\n`;
      text += `Notes: ${order.delivery_notes || "None"}`;
    }

    navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard!");
    setTimeout(() => setMessage(""), 2000);
  };

  const ALL_STATUSES = ["pending", "approved", "rejected", "paid", "completed"];
  const isPaid = order.status === "paid";

  return (
    <div className="space-y-6">
      {/* Order Details */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
          <p className="text-sm text-gray-600">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{order.customer_email}</p>
          <p className="text-sm text-gray-600">{order.customer_phone}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"} Information
          </h4>
          <p className="text-sm text-gray-600">
            {new Date(order.fulfillment_type === "delivery" ? order.delivery_date! : order.pickup_date!).toLocaleDateString()}
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

      {/* Deadlines */}
      <div className={isPaid ? "bg-yellow-50 border border-yellow-200 p-4 rounded" : ""}>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Production Deadlines</h4>
        <p className={`text-sm ${isPaid ? "font-bold text-yellow-900" : "text-gray-600"}`}>
          Production Deadline: {new Date(order.production_deadline).toLocaleDateString()}
        </p>
        <p className={`text-sm ${isPaid ? "font-bold text-yellow-900" : "text-gray-600"}`}>
          Bake Deadline: {new Date(order.bake_deadline).toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Status selector — any status can be set */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Set status:</label>
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
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
          <span
            className={`text-sm ${
              message.includes("success") || message.includes("Copied")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
