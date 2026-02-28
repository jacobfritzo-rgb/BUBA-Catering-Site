"use client";

import { useState } from "react";

interface PortionCalculatorProps {
  onAddToOrder?: (partyBoxes: number, bigBoxes: number) => void;
}

// Prices
const PARTY_BOX_PRICE = 225;
const BIG_BOX_PRICE = 78;

// Servings per box per mode
const PB_SERVINGS = { main: 10, side: 15 };
const BB_SERVINGS = { main: 4, side: 8 };

type Mode = "main" | "side";

interface BoxRec {
  partyQty: number;
  bigQty: number;
}

function buildRec(n: number, mode: Mode): { recommended: BoxRec; alternate: BoxRec | null } {
  const nEff = mode === "main" ? Math.ceil(n * 1.1) : n;
  const partyQty = Math.ceil(nEff / PB_SERVINGS[mode]);
  const bigQty = Math.ceil(nEff / BB_SERVINGS[mode]);

  if (n >= 41) {
    return { recommended: { partyQty, bigQty: 0 }, alternate: null };
  } else if (n >= 13) {
    return {
      recommended: { partyQty, bigQty: 0 },
      alternate: { partyQty: 0, bigQty },
    };
  } else {
    return {
      recommended: { partyQty: 0, bigQty },
      alternate: { partyQty, bigQty: 0 },
    };
  }
}

function recLabel(rec: BoxRec): string {
  if (rec.partyQty > 0) return `${rec.partyQty} Party Box${rec.partyQty > 1 ? "es" : ""}`;
  return `${rec.bigQty} Big Box${rec.bigQty > 1 ? "es" : ""}`;
}

function recCost(rec: BoxRec): number {
  return rec.partyQty * PARTY_BOX_PRICE + rec.bigQty * BIG_BOX_PRICE;
}

export default function PortionCalculator({ onAddToOrder }: PortionCalculatorProps) {
  const [people, setPeople] = useState<number>(10);
  const [mode, setMode] = useState<Mode>("main");
  const [showResults, setShowResults] = useState(false);
  const [added, setAdded] = useState<"recommended" | "alternate" | null>(null);

  const { recommended, alternate } = buildRec(people, mode);

  const handleAdd = (rec: BoxRec, which: "recommended" | "alternate") => {
    if (!onAddToOrder) return;
    onAddToOrder(rec.partyQty, rec.bigQty);
    setAdded(which);
    setTimeout(() => setAdded(null), 2500);
  };

  return (
    <div className="bg-[#E10600] text-white border-4 border-black p-8 mb-8">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-3xl font-black uppercase tracking-tight mb-2 text-center">
          Portion Calculator
        </h3>
        <p className="text-center mb-6 text-sm uppercase tracking-wide">
          Not sure how much to order? Let us help!
        </p>

        <div className="bg-white text-black p-6 border-4 border-black">
          <div className="space-y-6">
            {/* Number of people */}
            <div>
              <label className="block font-black uppercase text-sm mb-2">
                How many people are you feeding?
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={people}
                onChange={(e) => {
                  setShowResults(false);
                  setPeople(Math.max(1, parseInt(e.target.value) || 1));
                }}
                className="w-full px-4 py-3 border-4 border-black font-black text-2xl text-center"
              />
            </div>

            {/* Main or side */}
            <div>
              <label className="block font-black uppercase text-sm mb-2">
                Will burekas be...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setMode("main"); setShowResults(false); }}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    mode === "main"
                      ? "border-[#E10600] bg-[#E10600] text-white"
                      : "border-black bg-white text-black hover:border-[#E10600]"
                  }`}
                >
                  The Main Event
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("side"); setShowResults(false); }}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    mode === "side"
                      ? "border-[#E10600] bg-[#E10600] text-white"
                      : "border-black bg-white text-black hover:border-[#E10600]"
                  }`}
                >
                  One of Several Dishes
                </button>
              </div>
            </div>

            {/* Calculate button */}
            <button
              onClick={() => setShowResults(true)}
              className="w-full bg-[#E10600] hover:bg-black text-white font-black py-4 px-6 uppercase tracking-tight border-4 border-black transition-colors text-xl"
            >
              Calculate Portions
            </button>

            {/* Results */}
            {showResults && (
              <div className="border-t-4 border-black pt-6 mt-6 space-y-4">
                <h4 className="font-black uppercase text-lg">Recommended Order:</h4>

                {/* Recommended */}
                <div className="bg-gray-50 p-4 border-2 border-black">
                  <p className="font-black uppercase text-xs mb-2 text-[#E10600]">Recommended</p>
                  <p className="text-2xl font-black text-[#E10600] mb-1">{recLabel(recommended)}</p>
                  <p className="text-sm font-medium mb-3">Estimated total: ${recCost(recommended)}</p>
                  {onAddToOrder && (
                    <button
                      type="button"
                      onClick={() => handleAdd(recommended, "recommended")}
                      className={`w-full py-2 px-4 font-black uppercase text-sm border-2 transition-colors ${
                        added === "recommended"
                          ? "bg-green-600 border-green-600 text-white"
                          : "bg-black border-black text-white hover:bg-[#E10600] hover:border-[#E10600]"
                      }`}
                    >
                      {added === "recommended" ? "✓ ADDED! SCROLL DOWN TO CONTINUE" : "ADD TO MY ORDER →"}
                    </button>
                  )}
                </div>

                {/* Alternate (if applicable) */}
                {alternate && (
                  <div className="bg-gray-50 p-4 border-2 border-gray-300">
                    <p className="font-black uppercase text-xs mb-2 text-gray-500">Alternative Option</p>
                    <p className="text-2xl font-black text-gray-700 mb-1">{recLabel(alternate)}</p>
                    <p className="text-sm font-medium mb-3">Estimated total: ${recCost(alternate)}</p>
                    {onAddToOrder && (
                      <button
                        type="button"
                        onClick={() => handleAdd(alternate, "alternate")}
                        className={`w-full py-2 px-4 font-black uppercase text-sm border-2 transition-colors ${
                          added === "alternate"
                            ? "bg-green-600 border-green-600 text-white"
                            : "bg-black border-black text-white hover:bg-[#E10600] hover:border-[#E10600]"
                        }`}
                      >
                        {added === "alternate" ? "✓ ADDED! SCROLL DOWN TO CONTINUE" : "ADD THIS INSTEAD →"}
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 italic">
                  * These are estimates. Adjust based on your guests&apos; appetites!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
