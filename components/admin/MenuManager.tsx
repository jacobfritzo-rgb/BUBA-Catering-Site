"use client";

import { useState } from "react";
import { Flavor } from "@/lib/types";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  available: number;
  sort_order: number;
}

interface MenuManagerProps {
  flavors: Flavor[];
  menuItems: MenuItem[];
  onUpdate: () => void;
}

const CATEGORIES = [
  { value: "salad", label: "Salads" },
  { value: "sauce", label: "Sauces & Dips" },
  { value: "drink", label: "Drinks" },
  { value: "side", label: "Sides" },
  { value: "other", label: "Other" },
];

export default function MenuManager({ flavors, menuItems, onUpdate }: MenuManagerProps) {
  const [newFlavorName, setNewFlavorName] = useState("");
  const [newFlavorDescription, setNewFlavorDescription] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("salad");
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState<"flavors" | "addons">("flavors");

  const addFlavor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setMessage("");

    try {
      const response = await fetch("/api/flavors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFlavorName,
          description: newFlavorDescription,
        }),
      });

      if (response.ok) {
        setMessage("✓ Flavor added successfully");
        setNewFlavorName("");
        setNewFlavorDescription("");
        onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to add flavor");
      }
    } catch (error) {
      setMessage("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setMessage("");

    const priceCents = Math.round(parseFloat(newItemPrice) * 100);

    try {
      const response = await fetch("/api/menu-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newItemName,
          description: newItemDescription,
          price_cents: priceCents,
          category: newItemCategory,
        }),
      });

      if (response.ok) {
        setMessage("✓ Menu item added successfully");
        setNewItemName("");
        setNewItemDescription("");
        setNewItemPrice("");
        setNewItemCategory("salad");
        onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to add menu item");
      }
    } catch (error) {
      setMessage("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const deleteFlavor = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/flavors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage("✓ Flavor deleted successfully");
        onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to delete flavor");
      }
    } catch (error) {
      setMessage("Network error");
    }
  };

  const deleteMenuItem = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/menu-items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setMessage("✓ Menu item deleted successfully");
        onUpdate();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to delete menu item");
      }
    } catch (error) {
      setMessage("Network error");
    }
  };

  // Group menu items by category
  const itemsByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveCategory("flavors")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeCategory === "flavors"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Bureka Flavors
        </button>
        <button
          onClick={() => setActiveCategory("addons")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeCategory === "addons"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Add-ons & Other Items
        </button>
      </div>

      {/* Global Message */}
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.includes("✓")
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Bureka Flavors Section */}
      {activeCategory === "flavors" && (
        <>
          {/* Add New Flavor Form */}
          <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Bureka Flavor</h3>
            <form onSubmit={addFlavor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                    Flavor Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newFlavorName}
                    onChange={(e) => setNewFlavorName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Mushroom & Gruyère"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
                    Description / Ingredients
                  </label>
                  <input
                    id="description"
                    type="text"
                    value={newFlavorDescription}
                    onChange={(e) => setNewFlavorDescription(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., wild mushrooms, gruyère, thyme"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? "Adding..." : "➕ Add Flavor"}
              </button>
            </form>
          </div>

          {/* Current Flavors List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Current Flavors ({flavors.length})</h3>
            </div>

            {flavors.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No flavors yet. Add your first one above!
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {flavors.map((flavor) => (
                  <div key={flavor.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{flavor.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {flavor.description || "No description"}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteFlavor(flavor.name)}
                        className="ml-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg font-medium transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add-ons & Other Items Section */}
      {activeCategory === "addons" && (
        <>
          {/* Add New Item Form */}
          <div className="bg-white shadow-sm rounded-lg p-6 border-2 border-blue-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Menu Item</h3>
            <form onSubmit={addMenuItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Israeli Salad"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 16oz container"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? "Adding..." : "➕ Add Item"}
              </button>
            </form>
          </div>

          {/* Current Items by Category */}
          {menuItems.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg p-8">
              <div className="text-center text-gray-500">
                <p className="text-lg font-semibold mb-2">No menu items yet</p>
                <p className="text-sm">Add your first item using the form above!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map(category => {
                const items = itemsByCategory[category.value] || [];
                if (items.length === 0) return null;

                return (
                  <div key={category.value} className="bg-white shadow-sm rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900">{category.label} ({items.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-baseline gap-3">
                                <h4 className="text-lg font-bold text-gray-900">{item.name}</h4>
                                <span className="text-lg font-semibold text-green-600">
                                  ${(item.price_cents / 100).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {item.description || "No description"}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteMenuItem(item.id, item.name)}
                              className="ml-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg font-medium transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
