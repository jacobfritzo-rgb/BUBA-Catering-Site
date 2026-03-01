"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  fulfillment_type: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  delivery_address?: string;
  order_data: {
    items: Array<{
      type: string;
      quantity: number;
      flavors: Array<{ name: string; quantity: number }>;
    }>;
    addons?: Array<{ name: string; quantity: number }>;
  };
}

export default function PrintProductionSheet() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPaidOrders = async () => {
      try {
        const response = await fetch("/api/orders?status=paid");
        if (response.ok) {
          const data = await response.json();
          // Sort by date
          const sorted = data.sort((a: Order, b: Order) => {
            const aDate = a.fulfillment_type === 'delivery' ? a.delivery_date! : a.pickup_date!;
            const bDate = b.fulfillment_type === 'delivery' ? b.delivery_date! : b.pickup_date!;
            return aDate.localeCompare(bDate);
          });
          setOrders(sorted);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaidOrders();
  }, []);

  useEffect(() => {
    // Auto-trigger print dialog after data loads
    if (!isLoading && orders.length > 0) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [isLoading, orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading production sheet...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Orders in Production</h1>
          <p className="text-gray-600 mb-4">There are no paid orders to print.</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.5in;
          }
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-gray-300 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold mb-2 w-full"
        >
          🖨️ Print
        </button>
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 w-full"
        >
          Back to Admin
        </button>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="text-center mb-4 border-b-4 border-black pb-2">
          <h1 className="text-3xl font-black uppercase">BUBA CATERING - PRODUCTION SHEET</h1>
          <p className="text-sm mt-1">
            Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Production Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="border-2 border-black px-2 py-2 text-left">ORDER #</th>
              <th className="border-2 border-black px-2 py-2 text-left">DATE</th>
              <th className="border-2 border-black px-2 py-2 text-left">TIME</th>
              <th className="border-2 border-black px-2 py-2 text-left">TYPE</th>
              <th className="border-2 border-black px-2 py-2 text-left">WHAT TO MAKE</th>
              <th className="border-2 border-black px-2 py-2 text-left">CUSTOMER / ADDRESS</th>
              <th className="border-2 border-black px-2 py-2 text-center w-16">✓</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const date = order.fulfillment_type === 'delivery' ? order.delivery_date! : order.pickup_date!;
              const time = order.fulfillment_type === 'delivery'
                ? `${order.delivery_window_start}-${order.delivery_window_end}`
                : order.pickup_time;
              const type = order.fulfillment_type === 'delivery' ? 'DELIVERY' : 'PICKUP';

              // Build "what to make" string
              const items: string[] = [];
              order.order_data.items.forEach(item => {
                if (item.type === 'party_box') {
                  const flavors = item.flavors.map(f => `${f.name} (${f.quantity})`).join(', ');
                  items.push(`Party Box ×${item.quantity}: ${flavors}`);
                } else {
                  items.push(`Big Box ×${item.quantity}: in-store stock`);
                }
              });

              if (order.order_data.addons && order.order_data.addons.length > 0) {
                const addons = order.order_data.addons.map(a => `${a.name} x${a.quantity}`).join(', ');
                items.push(`Add-ons: ${addons}`);
              }

              const customerInfo = order.fulfillment_type === 'delivery'
                ? `${order.customer_name}\n${order.customer_phone}\n${order.delivery_address}`
                : `${order.customer_name}\n${order.customer_phone}`;

              return (
                <tr key={order.id} className={idx % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                  <td className="border-2 border-black px-2 py-2 font-bold">#{order.id}</td>
                  <td className="border-2 border-black px-2 py-2 whitespace-nowrap">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="border-2 border-black px-2 py-2 whitespace-nowrap font-mono text-xs">
                    {time}
                  </td>
                  <td className="border-2 border-black px-2 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-bold ${
                      type === 'DELIVERY' ? 'bg-purple-200' : 'bg-orange-200'
                    }`}>
                      {type}
                    </span>
                  </td>
                  <td className="border-2 border-black px-2 py-2">
                    {items.map((item, i) => (
                      <div key={i} className="mb-1 text-xs">
                        <strong>{item.split(':')[0]}:</strong> {item.split(':').slice(1).join(':')}
                      </div>
                    ))}
                  </td>
                  <td className="border-2 border-black px-2 py-2 text-xs whitespace-pre-line">
                    {customerInfo}
                  </td>
                  <td className="border-2 border-black px-2 py-2 text-center">
                    <div className="w-8 h-8 border-2 border-gray-400 mx-auto"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary at bottom */}
        <div className="mt-6 border-t-4 border-black pt-4">
          <h3 className="font-bold text-lg mb-2">SUMMARY:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Total Orders:</strong> {orders.length}
            </div>
            <div>
              <strong>Total Boxes:</strong>{' '}
              {orders.reduce((sum, o) => sum + o.order_data.items.reduce((s, i) => s + i.quantity, 0), 0)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
