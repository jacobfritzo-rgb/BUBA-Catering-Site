"use client";

import { useMemo } from "react";
import { Order } from "@/lib/types";

interface AnalyticsViewProps {
  orders: Order[];
}

function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "blue" | "green" | "purple" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };
  const subColorMap = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    red: "text-red-600",
  };

  return (
    <div className={`rounded-lg border-2 p-5 ${colorMap[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-black">{value}</p>
      {sub && <p className={`text-xs font-medium mt-1 ${subColorMap[color]}`}>{sub}</p>}
    </div>
  );
}

export default function AnalyticsView({ orders }: AnalyticsViewProps) {
  const {
    revenueOrders,
    weekRevenue,
    monthRevenue,
    totalRevenue,
    avgOrderValue,
    statusCounts,
    topFlavors,
    topAddons,
    partyBoxTotal,
    bigBoxTotal,
    startOfWeek,
    startOfMonth,
  } = useMemo(() => {
    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "completed"
    );

    const weekRevenue = revenueOrders
      .filter((o) => new Date(o.created_at) >= startOfWeek)
      .reduce((sum, o) => sum + o.total_price, 0);

    const monthRevenue = revenueOrders
      .filter((o) => new Date(o.created_at) >= startOfMonth)
      .reduce((sum, o) => sum + o.total_price, 0);

    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total_price, 0);

    const avgOrderValue =
      revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

    // Orders by status
    const statusCounts = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Top flavors from revenue orders
    const flavorCounts: Record<string, number> = {};
    let partyBoxTotal = 0;
    let bigBoxTotal = 0;

    revenueOrders.forEach((order) => {
      order.order_data.items.forEach((item) => {
        if (item.type === "party_box") partyBoxTotal += item.quantity;
        else bigBoxTotal += item.quantity;

        item.flavors.forEach((flavor) => {
          flavorCounts[flavor.name] = (flavorCounts[flavor.name] || 0) + flavor.quantity;
        });
      });
    });

    const topFlavors = Object.entries(flavorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Top add-ons
    const addonCounts: Record<string, number> = {};
    revenueOrders.forEach((order) => {
      (order.order_data.addons || []).forEach((addon) => {
        addonCounts[addon.name] = (addonCounts[addon.name] || 0) + addon.quantity;
      });
    });
    const topAddons = Object.entries(addonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      revenueOrders,
      weekRevenue,
      monthRevenue,
      totalRevenue,
      avgOrderValue,
      statusCounts,
      topFlavors,
      topAddons,
      partyBoxTotal,
      bigBoxTotal,
      startOfWeek,
      startOfMonth,
    };
  }, [orders]);

  const totalBoxes = partyBoxTotal + bigBoxTotal;

  // Funnel: how many orders convert through each stage
  const funnelStages = [
    { label: "Received", count: orders.length, color: "bg-gray-400" },
    {
      label: "Approved",
      count: orders.filter((o) =>
        ["approved", "paid", "completed"].includes(o.status)
      ).length,
      color: "bg-yellow-400",
    },
    {
      label: "Paid",
      count: orders.filter((o) => ["paid", "completed"].includes(o.status)).length,
      color: "bg-green-500",
    },
    {
      label: "Completed",
      count: orders.filter((o) => o.status === "completed").length,
      color: "bg-blue-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Revenue Cards */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
          Revenue (Paid + Completed Orders)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="This Week"
            value={`$${(weekRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${revenueOrders.filter((o) => new Date(o.created_at) >= startOfWeek).length} orders`}
            color="green"
          />
          <StatCard
            label="This Month"
            value={`$${(monthRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${revenueOrders.filter((o) => new Date(o.created_at) >= startOfMonth).length} orders`}
            color="blue"
          />
          <StatCard
            label="All Time"
            value={`$${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${revenueOrders.length} orders`}
            color="purple"
          />
          <StatCard
            label="Avg Order Value"
            value={`$${(avgOrderValue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="paid & completed"
            color="green"
          />
        </div>
      </div>

      {/* Order Funnel + Box split */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Funnel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Order Pipeline</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {funnelStages.map((stage) => {
                const pct = orders.length > 0 ? (stage.count / orders.length) * 100 : 0;
                return (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {stage.count}
                        <span className="text-gray-400 font-normal ml-1">
                          ({pct.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {statusCounts["rejected"] > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-red-500 font-medium">
                    {statusCounts["rejected"]} rejected
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Box Split */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Box Mix{" "}
            <span className="text-sm font-normal text-gray-500">(paid & completed)</span>
          </h3>
          {totalBoxes === 0 ? (
            <p className="text-sm text-gray-500">No paid orders yet.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Party Boxes ($225)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {partyBoxTotal}{" "}
                    <span className="text-gray-400 font-normal">
                      ({((partyBoxTotal / totalBoxes) * 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(partyBoxTotal / totalBoxes) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {partyBoxTotal * 40} total pieces
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Big Boxes ($78)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {bigBoxTotal}{" "}
                    <span className="text-gray-400 font-normal">
                      ({((bigBoxTotal / totalBoxes) * 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(bigBoxTotal / totalBoxes) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {bigBoxTotal * 8} total pieces
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Flavors + Add-ons */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Flavors */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Top Flavors{" "}
            <span className="text-sm font-normal text-gray-500">(paid & completed)</span>
          </h3>
          {topFlavors.length === 0 ? (
            <p className="text-sm text-gray-500">No flavor data yet.</p>
          ) : (
            <div className="space-y-2">
              {topFlavors.map(([name, qty], i) => {
                const maxQty = topFlavors[0][1];
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                        <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                          {qty} pcs
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#E10600] rounded-full"
                          style={{ width: `${(qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Add-ons */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Top Add-ons{" "}
            <span className="text-sm font-normal text-gray-500">(paid & completed)</span>
          </h3>
          {topAddons.length === 0 ? (
            <p className="text-sm text-gray-500">No add-on data yet.</p>
          ) : (
            <div className="space-y-2">
              {topAddons.map(([name, qty], i) => {
                const maxQty = topAddons[0][1];
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                        <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                          {qty}x
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
