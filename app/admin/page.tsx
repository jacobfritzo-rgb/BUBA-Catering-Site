"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrderList from "@/components/admin/OrderList";
import MenuManager from "@/components/admin/MenuManager";
import CustomerList from "@/components/admin/CustomerList";
import ProductionView from "@/components/admin/ProductionView";
import { Order, Flavor } from "@/lib/types";

interface Customer {
  email: string;
  name: string;
  phone: string;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  order_count: number;
  last_order_date: string;
  first_order_date: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  available: number;
  sort_order: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "production" | "flavors" | "customers">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchFlavors = async () => {
    try {
      const response = await fetch("/api/flavors");
      if (response.ok) {
        const data = await response.json();
        setFlavors(data);
      }
    } catch (error) {
      console.error("Error fetching flavors:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items");
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchOrders(), fetchFlavors(), fetchCustomers(), fetchMenuItems()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const handleDeleteAllOrders = async () => {
    setIsDeletingOrders(true);
    try {
      const res = await fetch("/api/orders", { method: "DELETE" });
      if (res.ok) {
        setOrders([]);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Error deleting orders:", error);
    } finally {
      setIsDeletingOrders(false);
    }
  };

  const handleLogout = async () => {
    // Clear the cookie by calling a logout endpoint or just redirect
    document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } bg-white shadow-lg transition-all duration-300 overflow-hidden`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">BUBA Admin</h1>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Orders
            </button>

            <button
              onClick={() => setActiveTab("production")}
              className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "production"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Production
            </button>

            <button
              onClick={() => setActiveTab("customers")}
              className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "customers"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Customers
            </button>

            <button
              onClick={() => setActiveTab("flavors")}
              className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "flavors"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Menu
            </button>
          </nav>

          <div className="mt-8 space-y-2">
            <a
              href="/admin/faqs"
              className="block w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              ❓ FAQ Management
            </a>
            <a
              href="/admin/settings"
              className="block w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              ⚙️ Email Settings
            </a>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">Danger Zone</p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm border border-red-200"
                >
                  🗑 Delete All Orders
                </button>
              ) : (
                <div className="bg-red-50 border border-red-300 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-700">Delete ALL orders? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAllOrders}
                      disabled={isDeletingOrders}
                      className="flex-1 bg-red-600 text-white text-xs font-black uppercase py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeletingOrders ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-white text-gray-700 text-xs font-black uppercase py-1.5 rounded border border-gray-300 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Mobile Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden mb-4 px-4 py-2 bg-white rounded-lg shadow text-sm font-medium text-gray-700"
          >
            {isSidebarOpen ? "Close Menu" : "Open Menu"}
          </button>

          {/* Content */}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Orders</h2>
              <OrderList orders={orders} onOrderUpdate={fetchOrders} />
            </div>
          )}

          {activeTab === "production" && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Production Schedule</h2>
              <ProductionView orders={orders} />
            </div>
          )}

          {activeTab === "customers" && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Customers</h2>
              <CustomerList customers={customers} onExportComplete={fetchCustomers} />
            </div>
          )}

          {activeTab === "flavors" && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Menu Management</h2>
              <MenuManager flavors={flavors} menuItems={menuItems} onUpdate={() => { fetchFlavors(); fetchMenuItems(); }} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
