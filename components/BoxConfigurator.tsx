"use client";

import { Flavor } from "@/lib/types";

interface BoxConfiguratorProps {
  boxIndex: number;
  type: "party_box" | "big_box";
  flavors: Flavor[];
  selectedFlavors: string[]; // Just an array of flavor names now
  onFlavorToggle: (flavorName: string) => void;
  onRemove: () => void;
}

export default function BoxConfigurator({
  boxIndex,
  type,
  flavors,
  selectedFlavors,
  onFlavorToggle,
  onRemove,
}: BoxConfiguratorProps) {
  const maxFlavors = type === "party_box" ? 3 : 4; // Party Box: 3 max, Big Box: 4 max
  const boxName = type === "party_box" ? "PARTY BOX" : "BIG BOX";
  const price = type === "party_box" ? "$225" : "$78";
  const description = type === "party_box"
    ? "Serves 10-15 people • 40 mini burekas • Crushed tomato, tahini, schug, pickles, olives"
    : "Feeds 4-6 people • 8 half-size burekas • Tahini, crushed tomato, schug, pickles, olives, jammy eggs";

  const selectedCount = selectedFlavors.length;
  const isComplete = selectedCount >= 1 && selectedCount <= maxFlavors;
  const statusColor = isComplete ? "text-black" : "text-[#E10600]";

  return (
    <div className="border-4 border-[#E10600] p-6 bg-white">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-black uppercase tracking-tight text-black">
            {boxName} #{boxIndex + 1}
          </h3>
          <p className="text-sm font-bold text-black mb-2">{price}</p>
          <p className="text-xs text-black/70 font-medium leading-relaxed">{description}</p>
        </div>
        <button
          onClick={onRemove}
          className="text-[#E10600] hover:text-black text-sm font-black uppercase tracking-wide ml-4"
        >
          REMOVE
        </button>
      </div>

      <div className="mb-4 border-2 border-black p-2">
        <p className={`text-sm font-black uppercase tracking-wide ${statusColor}`}>
          {selectedCount} / {maxFlavors} FLAVORS MAX • PICK 1-{maxFlavors}
        </p>
      </div>

      <div className="space-y-2">
        {flavors.map((flavor) => {
          const isSelected = selectedFlavors.includes(flavor.name);
          const canSelect = selectedCount < maxFlavors || isSelected;

          return (
            <button
              key={flavor.name}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (canSelect) onFlavorToggle(flavor.name);
              }}
              disabled={!canSelect}
              className={`w-full flex items-center justify-between py-3 border-2 px-3 transition-colors ${
                isSelected
                  ? "border-[#E10600] bg-[#E10600] text-white"
                  : "border-black bg-white text-black hover:border-[#E10600]"
              } ${!canSelect ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex-1 text-left">
                <p className="font-bold uppercase tracking-wide text-sm">{flavor.name}</p>
                {flavor.description && (
                  <p className={`text-xs font-medium ${isSelected ? "text-white/80" : "text-black/60"}`}>
                    {flavor.description}
                  </p>
                )}
              </div>
              <div className="ml-4">
                {isSelected && (
                  <span className="font-black text-xl">✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
