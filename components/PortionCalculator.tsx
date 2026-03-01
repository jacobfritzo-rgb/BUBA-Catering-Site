"use client";

import { useState } from "react";

interface PortionCalculatorProps {
  onAddToOrder?: (partyBoxes: number, bigBoxes: number) => void;
}

// Prices
const PARTY_BOX_PRICE = 225;
const BIG_BOX_PRICE = 78;

// Serving sizes per box per mode
// Party Box (40 mini burekas): feeds 10–12 as main, 12–15 as side
// Big Box (8 half-size burekas): feeds 4 as main, 6–7 as side
const PB_SERVES_MIN = { main: 10, side: 12 }; // conservative minimum (how many a box safely feeds)
const PB_SERVES_MAX = { main: 12, side: 15 }; // max capacity (used to calculate Party Box alternates)
const BB_SERVES = { main: 4, side: 6 };

// Never suggest more than this many Big Boxes — above this, Party Boxes are the right call
const BIG_BOX_MAX = 8;

// In Party Box territory: if the remainder after filling with Party Boxes is less than
// this fraction of one Party Box, fill the gap with Big Boxes instead of adding another Party Box.
const COMBO_THRESHOLD = 0.6;

type Mode = "main" | "side";

interface BoxRec {
  partyQty: number;
  bigQty: number;
}

function buildRec(n: number, mode: Mode): { recommended: BoxRec; alternate: BoxRec | null } {
  const pbMin = PB_SERVES_MIN[mode];
  const pbMax = PB_SERVES_MAX[mode];
  const bbServes = BB_SERVES[mode];

  const pureBig = Math.ceil(n / bbServes);

  // Big Box zone: group is small enough that Big Boxes are the primary recommendation
  if (pureBig <= BIG_BOX_MAX) {
    // Offer Party Box as alternate once the group is large enough to warrant one
    const purePartyAlt = Math.ceil(n / pbMax);
    const showPartyAlt = pureBig >= 3;
    return {
      recommended: { partyQty: 0, bigQty: pureBig },
      alternate: showPartyAlt ? { partyQty: purePartyAlt, bigQty: 0 } : null,
    };
  }

  // Party Box zone: group is too large for 8 Big Boxes — switch to Party Boxes
  const partyFloor = Math.floor(n / pbMin);
  const remaining = n - partyFloor * pbMin;
  const purePartySafe = Math.ceil(n / pbMin);

  if (remaining === 0) {
    return { recommended: { partyQty: purePartySafe, bigQty: 0 }, alternate: null };
  }

  // There's a gap. If it's small, fill with Big Boxes instead of adding a whole extra Party Box.
  const bigForGap = Math.ceil(remaining / bbServes);
  if (remaining < pbMin * COMBO_THRESHOLD) {
    return {
      recommended: { partyQty: partyFloor, bigQty: bigForGap },
      alternate: { partyQty: purePartySafe, bigQty: 0 },
    };
  }

  return { recommended: { partyQty: purePartySafe, bigQty: 0 }, alternate: null };
}

function recLabel(rec: BoxRec): string {
  if (rec.partyQty > 0 && rec.bigQty > 0) {
    const pb = `${rec.partyQty} Party Box${rec.partyQty > 1 ? "es" : ""}`;
    const bb = `${rec.bigQty} Big Box${rec.bigQty > 1 ? "es" : ""}`;
    return `${pb} + ${bb}`;
  }
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
