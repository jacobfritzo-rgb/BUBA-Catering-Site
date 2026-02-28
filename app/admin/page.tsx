"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrderList from "@/components/admin/OrderList";
import MenuManager from "@/components/admin/MenuManager";
import CustomerList from "@/components/admin/CustomerList";
import ProductionView from "@/components/admin/ProductionView";
import PhotoManager from "@/components/admin/PhotoManager";
import CalendarView from "@/components/admin/CalendarView";
import AnalyticsView from "@/components/admin/AnalyticsView";
import { Order, Flavor } from "@/lib/types";

type AdminTab = "orders" | "production" | "calendar" | "analytics" | "customers" | "flavors" | "photos";

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

interface UploadedImage {
  key: string;
  content_type: string;
  updated_at: string;
}

const MAIN_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "orders", label: "Orders", icon: "📋" },
  { id: "production", label: "Production", icon: "🧑‍🍳" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

const MORE_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "flavors", label: "Menu", icon: "🥙" },
  { id: "photos", label: "Photos", icon: "🖼️" },
];

const ALL_SIDEBAR_TABS = [...MAIN_TABS, ...MORE_TABS];

const TAB_TITLES: Record<AdminTab, string> = {
  orders: "Orders",
  production: "Production Schedule",
  calendar: "Order Calendar",
  analytics: "Analytics",
  customers: "Customers",
  flavors: "Menu Management",
  photos: "Product Photos",
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  };

  const fetchFlavors = async () => {
    try {
      const res = await fetch("/api/flavors");
      if (res.ok) setFlavors(await res.json());
    } catch (e) {
      console.error("Error fetching flavors:", e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error("Error fetching customers:", e);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch("/api/menu-items");
      if (res.ok) setMenuItems(await res.json());
    } catch (e) {
      console.error("Error fetching menu items:", e);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/product-images");
      if (res.ok) setUploadedImages(await res.json());
    } catch (e) {
      console.error("Error fetching images:", e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchFlavors(),
        fetchCustomers(),
        fetchMenuItems(),
        fetchImages(),
      ]);
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
    } catch (e) {
      console.error("Error deleting orders:", e);
    } finally {
      setIsDeletingOrders(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/admin/login");
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileMoreOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500 font-medium">Loading...</div>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white shadow-lg flex-shrink-0">
        <div className="p-6 flex flex-col h-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">BUBA Admin</h1>

          <nav className="space-y-1 flex-1">
            {ALL_SIDEBAR_TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                  activeTab === id
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                {id === "orders" && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-1">
            <a
              href="/admin/faqs"
              className="flex items-center gap-3 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              ❓ FAQ Management
            </a>
            <a
              href="/admin/settings"
              className="flex items-center gap-3 w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              ⚙️ Email Settings
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              🚪 Logout
            </button>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">
                Danger Zone
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm border border-red-200"
                >
                  🗑 Delete All Orders
                </button>
              ) : (
                <div className="bg-red-50 border border-red-300 rounded p-3 space-y-2">
                  <p className="text-xs font-semibold text-red-700">
                    Delete ALL orders? Cannot be undone.
                  </p>
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

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            {TAB_TITLES[activeTab]}
          </h2>

          {activeTab === "orders" && (
            <OrderList orders={orders} onOrderUpdate={fetchOrders} />
          )}
          {activeTab === "production" && <ProductionView orders={orders} onUpdate={fetchOrders} />}
          {activeTab === "calendar" && <CalendarView orders={orders} />}
          {activeTab === "analytics" && <AnalyticsView orders={orders} />}
          {activeTab === "customers" && (
            <CustomerList customers={customers} onExportComplete={fetchCustomers} />
          )}
          {activeTab === "flavors" && (
            <MenuManager
              flavors={flavors}
              menuItems={menuItems}
              onUpdate={() => {
                fetchFlavors();
                fetchMenuItems();
              }}
            />
          )}
          {activeTab === "photos" && (
            <PhotoManager uploadedImages={uploadedImages} onUpdate={fetchImages} />
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 flex md:hidden z-50">
        {MAIN_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
              activeTab === id ? "text-blue-600" : "text-gray-500"
            }`}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">
              {label}
            </span>
            {id === "orders" && pendingCount > 0 && (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            {activeTab === id && (
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}

        {/* More button */}
        <button
          onClick={() => setMobileMoreOpen((v) => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
            mobileMoreOpen || MORE_TABS.some((t) => t.id === activeTab)
              ? "text-blue-600"
              : "text-gray-500"
          }`}
        >
          <span className="text-xl leading-none">☰</span>
          <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">More</span>
        </button>
      </nav>

      {/* ── Mobile More Drawer ──────────────────────────────────────────────── */}
      {mobileMoreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setMobileMoreOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t-2 border-gray-200 z-50 md:hidden shadow-lg">
            <div className="p-4 grid grid-cols-3 gap-3">
              {MORE_TABS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                    activeTab === id
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex gap-3">
              <a
                href="/admin/faqs"
                className="flex-1 text-center text-sm font-medium text-gray-600 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ❓ FAQs
              </a>
              <a
                href="/admin/settings"
                className="flex-1 text-center text-sm font-medium text-gray-600 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                ⚙️ Settings
              </a>
              <button
                onClick={handleLogout}
                className="flex-1 text-sm font-medium text-red-600 py-2 border border-red-200 rounded-lg hover:bg-red-50"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
