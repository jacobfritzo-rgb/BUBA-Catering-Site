"use client";

import { useState, useEffect } from "react";

export default function EventPhotos() {
  const [imageKeys, setImageKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/product-images")
      .then((res) => res.json())
      .then((data: { key: string }[]) => {
        setImageKeys(new Set(data.map((img) => img.key)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const slots = [1, 2, 3, 4];
  const filledSlots = loaded ? slots.filter((n) => imageKeys.has(`event-${n}`)) : [];

  // Don't render the section at all until we know what's uploaded,
  // and skip the section entirely if no event photos have been uploaded yet.
  if (!loaded || filledSlots.length === 0) return null;

  return (
    <div className="bg-white py-16 px-4 border-t-4 border-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-black uppercase tracking-tight text-black mb-4">
            BUBA at Your Event
          </h2>
          <p className="text-sm font-medium uppercase tracking-wide">
            Fresh burekas make any gathering special
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filledSlots.map((num) => (
            <div key={num} className="aspect-square border-4 border-black overflow-hidden">
              <img
                src={`/api/product-images/event-${num}`}
                alt={`BUBA catering event photo ${num}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
