"use client";

import { useState, useMemo } from "react";
import { Order } from "@/lib/types";
import { getFulfillmentDate } from "@/lib/utils";

interface ProductionViewProps {
  orders: Order[];
  onUpdate?: () => void;
}

interface FlavorTotal {
  name: string;
  quantity: number;
}

interface AddonTotal {
  name: string;
  quantity: number;
}

interface DayProduction {
  date: string;
  orders: Order[];
  flavorTotals: FlavorTotal[];
  addonTotals: AddonTotal[];
  partyBoxCount: number;
  bigBoxCount: number;
}

export default function ProductionView({ orders, onUpdate }: ProductionViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [markingDone, setMarkingDone] = useState<Record<number, boolean>>({});
  const [doneOverrides, setDoneOverrides] = useState<Record<number, boolean | undefined>>({});

  // Group paid orders by fulfillment date and calculate totals
  const productionByDate = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === "paid");
    const grouped: { [date: string]: Order[] } = {};

    paidOrders.forEach(order => {
      const date = getFulfillmentDate(order);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(order);
    });

    return Object.keys(grouped)
      .sort()
      .map(date => {
        const dayOrders = grouped[date];
        const flavorMap: { [name: string]: number } = {};
        const addonMap: { [name: string]: number } = {};
        let partyBoxCount = 0;
        let bigBoxCount = 0;

        dayOrders.forEach(order => {
          order.order_data.items.forEach(item => {
            if (item.type === "party_box") {
              partyBoxCount += item.quantity;
              // Only party box flavors need production
              item.flavors.forEach(flavor => {
                flavorMap[flavor.name] = (flavorMap[flavor.name] || 0) + flavor.quantity;
              });
            } else {
              bigBoxCount += item.quantity;
              // Big boxes use in-store stock — no production needed
            }
          });

          if (order.order_data.addons) {
            order.order_data.addons.forEach(addon => {
              addonMap[addon.name] = (addonMap[addon.name] || 0) + addon.quantity;
            });
          }
        });

        return {
          date,
          orders: dayOrders,
          flavorTotals: Object.entries(flavorMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity),
          addonTotals: Object.entries(addonMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity),
          partyBoxCount,
          bigBoxCount,
        };
      });
  }, [orders]);

  // Auto-select first date if none selected
  if (!selectedDate && productionByDate.length > 0) {
    setSelectedDate(productionByDate[0].date);
  }

  const selectedDay = productionByDate.find(d => d.date === selectedDate);

  const handleMarkDone = async (orderId: number, done: boolean) => {
    setMarkingDone(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ production_done: done ? 1 : 0 }),
      });
      if (res.ok) {
        setDoneOverrides(prev => ({ ...prev, [orderId]: done }));
        onUpdate?.();
      }
    } catch {
      // silently fail
    } finally {
      setMarkingDone(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const isProductionDone = (order: Order) =>
    doneOverrides[order.id] !== undefined ? doneOverrides[order.id]! : Boolean(order.production_done);

  if (productionByDate.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">No paid orders in production</p>
          <p className="text-sm">Orders will appear here once they&apos;re marked as paid</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Button */}
      <div className="flex justify-end">
        <a
          href="/admin/print"
          target="_blank"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-lg"
        >
          <span className="text-xl">🖨️</span>
          Print Production Sheet for Kitchen
        </a>
      </div>

      {/* Date Selector */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Select Production Date</h3>
        <div className="flex flex-wrap gap-2">
          {productionByDate.map(day => {
            const date = new Date(day.date + 'T00:00:00');
            const isToday = new Date().toDateString() === date.toDateString();
            const allDone = day.orders.every(o => isProductionDone(o));

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors text-left ${
                  selectedDate === day.date
                    ? "bg-blue-600 text-white border-blue-600"
                    : isToday
                    ? "bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs mt-1">
                  {day.orders.length} order{day.orders.length !== 1 ? 's' : ''}
                  {allDone && ' ✅'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <>
          {/* Box Summary */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Production for {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-700">Party Boxes</div>
                <div className="text-3xl font-black text-blue-900">{selectedDay.partyBoxCount}</div>
                <div className="text-xs text-blue-600">{selectedDay.partyBoxCount * 40} pieces to produce</div>
              </div>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600">Big Boxes</div>
                <div className="text-3xl font-black text-gray-700">{selectedDay.bigBoxCount}</div>
                <div className="text-xs text-gray-500">{selectedDay.bigBoxCount * 4} burekas — in-store stock</div>
              </div>
            </div>

            {/* Flavor Breakdown — party boxes only */}
            {selectedDay.flavorTotals.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-1">Party Box Flavor Production</h4>
                <p className="text-xs text-gray-500 mb-3">Big box flavors excluded — use in-store stock for those</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedDay.flavorTotals.map(flavor => (
                    <div key={flavor.name} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700">{flavor.name}</div>
                      <div className="text-2xl font-black text-gray-900">{flavor.quantity} pcs</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Addon Breakdown */}
            {selectedDay.addonTotals.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Add-ons to Prep</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedDay.addonTotals.map(addon => (
                    <div key={addon.name} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-purple-700">{addon.name}</div>
                      <div className="text-2xl font-black text-purple-900">{addon.quantity}x</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Details with production done toggle */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">
              Orders for This Day ({selectedDay.orders.length})
            </h4>
            <div className="space-y-4">
              {selectedDay.orders.map(order => {
                const done = isProductionDone(order);
                const isMarking = markingDone[order.id];

                return (
                  <div
                    key={order.id}
                    className={`border-2 rounded-lg p-4 transition-colors ${done ? "border-green-300 bg-green-50" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div>
                        <div className="font-bold text-gray-900">Order #{order.id} — {order.customer_name}</div>
                        <div className="text-sm text-gray-600">
                          {order.fulfillment_type === "delivery" ? (
                            <>
                              📦 Customer window: {order.delivery_window_start}–{order.delivery_window_end}
                              {order.metrospeedy_pickup_time && (
                                <span className="ml-2 font-semibold text-orange-700"> | MetroSpeedy pickup: {order.metrospeedy_pickup_time}</span>
                              )}
                            </>
                          ) : (
                            <>🏪 Pickup {order.pickup_time}</>
                          )}
                        </div>
                        {order.fulfillment_type === "delivery" && (
                          <div className="text-sm text-gray-500">{order.delivery_address}</div>
                        )}
                      </div>

                      {/* Production done toggle */}
                      <div className="shrink-0">
                        {done ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-bold border border-green-300">
                              ✅ Done
                            </span>
                            <button
                              onClick={() => handleMarkDone(order.id, false)}
                              disabled={isMarking}
                              className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleMarkDone(order.id, true)}
                            disabled={isMarking}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-wide rounded border-2 border-green-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isMarking ? "..." : "✓ Mark Done"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    {order.order_data.items.map((item, idx) => (
                      <div key={idx} className={`mb-2 pl-4 ${item.type === "party_box" ? "border-l-4 border-blue-300" : "border-l-4 border-gray-300"}`}>
                        <div className="font-medium text-sm">
                          {item.type === "party_box" ? "🎉 Party Box" : "📦 Big Box"} ×{item.quantity}
                        </div>
                        {item.type === "party_box" ? (
                          <div className="text-sm text-gray-600 ml-2">
                            {item.flavors.map(f => (
                              <div key={f.name}>{f.name}: {f.quantity} pcs</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 ml-2 italic">Use in-store stock ({item.quantity * 8} burekas)</div>
                        )}
                      </div>
                    ))}

                    {/* Addons */}
                    {order.order_data.addons && order.order_data.addons.length > 0 && (
                      <div className="mt-2 pl-4 border-l-4 border-purple-300">
                        <div className="font-medium text-sm text-purple-700">Add-ons:</div>
                        <div className="text-sm text-gray-600 ml-2">
                          {order.order_data.addons.map((addon, idx) => (
                            <div key={idx}>{addon.name} ×{addon.quantity}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
