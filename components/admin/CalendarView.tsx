"use client";

import { useState, useMemo } from "react";
import { Order } from "@/lib/types";
import { getFulfillmentDate, getFulfillmentTimeDisplay } from "@/lib/utils";

interface CalendarViewProps {
  orders: Order[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-400",
  approved: "bg-yellow-400",
  paid: "bg-green-500",
  completed: "bg-blue-500",
  rejected: "bg-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
  completed: "Completed",
  rejected: "Rejected",
};

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarView({ orders }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today));

  const todayStr = toDateStr(today);

  // Map fulfillment date → orders (excluding rejected)
  const ordersByDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders
      .filter((o) => o.status !== "rejected")
      .forEach((order) => {
        const date = getFulfillmentDate(order);
        if (date) {
          if (!map[date]) map[date] = [];
          map[date].push(order);
        }
      });
    return map;
  }, [orders]);

  // Build calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [currentMonth]);

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const selectedOrders = selectedDate ? ordersByDate[selectedDate] || [] : [];

  // Revenue for selected day (paid + completed)
  const selectedDayRevenue = selectedOrders
    .filter((o) => o.status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + o.total_price, 0);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Status:</span>
        {Object.entries(STATUS_LABELS).filter(([k]) => k !== "rejected").map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]}`} />
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        {/* Month header */}
        <div className="min-w-[420px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 font-bold text-gray-600 text-lg"
          >
            ‹
          </button>
          <h3 className="text-lg font-bold text-gray-900">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 font-bold text-gray-600 text-lg"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={i} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50" />;
            }

            const dateStr = toDateStr(day);
            const dayOrders = ordersByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const isPast = day < today && !isToday;

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-blue-200"
                    : isPast
                    ? "bg-gray-50/70 hover:bg-gray-100"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Date number */}
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1 ${
                    isToday
                      ? "bg-[#E10600] text-white"
                      : isSelected
                      ? "bg-blue-600 text-white"
                      : isPast
                      ? "text-gray-400"
                      : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </div>

                {/* Order dots */}
                {dayOrders.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayOrders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className={`w-2 h-2 rounded-full ${STATUS_COLORS[order.status]}`}
                        title={`#${order.id} ${order.customer_name}`}
                      />
                    ))}
                    {dayOrders.length > 4 && (
                      <span className="text-xs text-gray-400 leading-none">
                        +{dayOrders.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Order count badge */}
                {dayOrders.length > 0 && (
                  <div className="mt-0.5">
                    <span className="text-xs text-gray-500 font-medium">
                      {dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>{/* end min-w wrapper */}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            {selectedDayRevenue > 0 && (
              <span className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                ${(selectedDayRevenue / 100).toFixed(2)} confirmed
              </span>
            )}
          </div>

          {selectedOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedOrders
                .sort((a, b) => getFulfillmentTimeDisplay(a).localeCompare(getFulfillmentTimeDisplay(b)))
                .map((order) => {
                  const partyCount = order.order_data.items.filter(
                    (i) => i.type === "party_box"
                  ).length;
                  const bigCount = order.order_data.items.filter(
                    (i) => i.type === "big_box"
                  ).length;

                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      {/* Status dot */}
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLORS[order.status]}`}
                      />

                      {/* Time */}
                      <div className="text-sm font-bold text-gray-500 w-24 flex-shrink-0">
                        {getFulfillmentTimeDisplay(order) || "—"}
                      </div>

                      {/* Customer & boxes */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 truncate">
                          {order.customer_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {partyCount > 0 && `${partyCount} Party Box${partyCount > 1 ? "es" : ""}`}
                          {partyCount > 0 && bigCount > 0 && " + "}
                          {bigCount > 0 && `${bigCount} Big Box${bigCount > 1 ? "es" : ""}`}
                          {" · "}
                          {order.fulfillment_type === "delivery" ? "📦 Delivery" : "🏪 Pickup"}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`text-xs font-bold uppercase px-2 py-1 rounded flex-shrink-0 ${
                          order.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : order.status === "approved"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>

                      {/* Price */}
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                        ${(order.total_price / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
