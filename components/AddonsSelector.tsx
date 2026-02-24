"use client";

import { useState, useEffect } from "react";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
}

interface AddonsSelectorProps {
  addons: { [name: string]: number };
  onChange: (name: string, quantity: number, priceCents: number) => void;
}

export default function AddonsSelector({ addons, onChange }: AddonsSelectorProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu-items")
      .then((res) => res.json())
      .then((data) => {
        setMenuItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching menu items:", err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="border-4 border-[#E10600] p-6 bg-white">
        <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-4">ADD-ONS</h3>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return null; // Don't show the section if there are no add-ons
  }

  return (
    <div className="border-4 border-[#E10600] p-6 bg-white">
      <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-4">ADD-ONS</h3>

      <div className="space-y-2">
        {menuItems.map((item) => {
          const quantity = addons[item.name] || 0;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 border-b-2 border-black"
            >
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wide text-black text-sm">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-black/70">{item.description}</p>
                )}
                <p className="text-sm font-bold text-black">
                  ${(item.price_cents / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange(item.name, Math.max(0, quantity - 1), item.price_cents)}
                  disabled={quantity === 0}
                  className="w-9 h-9 border-2 border-black text-black font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#E10600] hover:border-[#E10600] hover:text-white transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center font-black text-black text-lg">{quantity}</span>
                <button
                  onClick={() => onChange(item.name, quantity + 1, item.price_cents)}
                  disabled={quantity >= 10}
                  className="w-9 h-9 border-2 border-black text-black font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#E10600] hover:border-[#E10600] hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
