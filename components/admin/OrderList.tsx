"use client";

import React, { useState } from "react";
import { Order, OrderStatus } from "@/lib/types";
import { getFulfillmentDate, getFulfillmentTime, getFulfillmentTimeDisplay, parseLocalDate } from "@/lib/utils";
import OrderDetail from "./OrderDetail";

interface OrderListProps {
  orders: Order[];
  onOrderUpdate: () => void;
}

const STATUS_FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function OrderList({ orders, onOrderUpdate }: OrderListProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">("all");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const filteredOrders = orders
    .filter((order) => selectedStatus === "all" ? true : order.status === selectedStatus)
    .sort((a, b) => {
      // Sort by fulfillment date/time (earliest first)
      const aDate = getFulfillmentDate(a);
      const aTime = getFulfillmentTime(a);
      const bDate = getFulfillmentDate(b);
      const bTime = getFulfillmentTime(b);

      const aDateTime = new Date(`${aDate}T${aTime}`).getTime();
      const bDateTime = new Date(`${bDate}T${bTime}`).getTime();

      return aDateTime - bDateTime;
    });

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedStatus(filter.value)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedStatus === filter.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Boxes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                // Check if order is today or tomorrow
                const fulfillmentDateStr = getFulfillmentDate(order);
                const fulfillmentDate = new Date(fulfillmentDateStr + 'T00:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const isToday = fulfillmentDate.getTime() === today.getTime();
                const isTomorrow = fulfillmentDate.getTime() === tomorrow.getTime();

                return (
                <React.Fragment key={order.id}>
                  <tr
                    onClick={() => toggleExpand(order.id)}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      isToday && order.status === "paid" ? "bg-yellow-50" :
                      isTomorrow && order.status === "paid" ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {isToday && order.status === "paid" && <span className="text-yellow-600 font-black mr-1">⚡</span>}
                      {isTomorrow && order.status === "paid" && <span className="text-blue-600 font-black mr-1">📅</span>}
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        order.fulfillment_type === "delivery"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-orange-100 text-orange-800"
                      }`}>
                        {order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{parseLocalDate(getFulfillmentDate(order)).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {getFulfillmentTimeDisplay(order)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.order_data.items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(order.total_price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <OrderDetail order={order} onUpdate={onOrderUpdate} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
