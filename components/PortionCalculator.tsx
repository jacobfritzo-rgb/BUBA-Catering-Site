"use client";

import { useState } from "react";

interface PortionCalculatorProps {
  onAddToOrder?: (partyBoxes: number, bigBoxes: number) => void;
}

interface Recommendation {
  label: string;
  partyBoxes: number;
  bigBoxes: number;
  cost: number;
}

export default function PortionCalculator({ onAddToOrder }: PortionCalculatorProps) {
  const [people, setPeople] = useState<number>(10);
  const [isMainEvent, setIsMainEvent] = useState<boolean>(true);
  const [showResults, setShowResults] = useState(false);
  const [addedOption, setAddedOption] = useState<"A" | "B" | null>(null);

  const calculate = () => {
    setShowResults(true);
    setAddedOption(null);
  };

  // ─── Algorithm ───────────────────────────────────────────────────────────────
  // Two-track recommendations, never more than 4 big boxes in any single recommendation.
  //
  // Main course: 2 pcs/person for all-big-box option, 3 pcs/person for party box option
  // Side dish: 1.5 pcs/person — big boxes only if ≤2 needed, else party box
  //
  // Verified against owner's examples:
  //   10 main → 3 big boxes OR 1 party box
  //   15 main → 4 big boxes OR 1 party box + 1 big box
  //   10 side → 2 big boxes
  //   15 side → 1 party box

  let optionA: Recommendation | null = null; // Big boxes only (main course ≤4 big boxes)
  let optionB: Recommendation | null = null; // Party box route (main course)
  let singleRec: Recommendation | null = null; // Single recommendation (side dish, or main when rawBig > 4)

  if (isMainEvent) {
    const rawBigBoxes = Math.ceil((people * 2) / 8);

    // Party box calculation: 3 pcs/person
    const partyPieces = people * 3;
    let partyBoxCount = Math.max(1, Math.floor(partyPieces / 40));
    let remainder = Math.max(0, partyPieces - partyBoxCount * 40);
    let extraBig = remainder > 0 ? Math.ceil(remainder / 8) : 0;

    // If extra big boxes exceed 4, round up to another party box
    if (extraBig > 4) {
      partyBoxCount = Math.ceil(partyPieces / 40);
      remainder = Math.max(0, partyPieces - partyBoxCount * 40);
      extraBig = remainder > 0 ? Math.ceil(remainder / 8) : 0;
    }

    const partyLabel =
      extraBig > 0
        ? `${partyBoxCount} Party Box${partyBoxCount > 1 ? "es" : ""} + ${extraBig} Big Box${extraBig > 1 ? "es" : ""}`
        : `${partyBoxCount} Party Box${partyBoxCount > 1 ? "es" : ""}`;
    const partyCost = partyBoxCount * 225 + extraBig * 78;

    if (rawBigBoxes <= 4) {
      // Show both options side by side
      const bigLabel = `${rawBigBoxes} Big Box${rawBigBoxes > 1 ? "es" : ""}`;
      optionA = { label: bigLabel, partyBoxes: 0, bigBoxes: rawBigBoxes, cost: rawBigBoxes * 78 };
      optionB = { label: partyLabel, partyBoxes: partyBoxCount, bigBoxes: extraBig, cost: partyCost };
    } else {
      // rawBig > 4: only recommend the party box route
      singleRec = { label: partyLabel, partyBoxes: partyBoxCount, bigBoxes: extraBig, cost: partyCost };
    }
  } else {
    // Side dish: 1.5 pcs/person
    const rawBigBoxes = Math.ceil((people * 1.5) / 8);

    if (rawBigBoxes <= 2) {
      const bigLabel = `${rawBigBoxes} Big Box${rawBigBoxes > 1 ? "es" : ""}`;
      singleRec = { label: bigLabel, partyBoxes: 0, bigBoxes: rawBigBoxes, cost: rawBigBoxes * 78 };
    } else {
      const partyBoxCount = Math.ceil((people * 1.5) / 40);
      const partyLabel = `${partyBoxCount} Party Box${partyBoxCount > 1 ? "es" : ""}`;
      singleRec = { label: partyLabel, partyBoxes: partyBoxCount, bigBoxes: 0, cost: partyBoxCount * 225 };
    }
  }

  const handleAdd = (option: "A" | "B") => {
    if (!onAddToOrder) return;
    const rec = option === "A" ? optionA : optionB;
    if (!rec) return;
    onAddToOrder(rec.partyBoxes, rec.bigBoxes);
    setAddedOption(option);
    setTimeout(() => setAddedOption(null), 2500);
  };

  const handleAddSingle = () => {
    if (!onAddToOrder || !singleRec) return;
    onAddToOrder(singleRec.partyBoxes, singleRec.bigBoxes);
    setAddedOption("A");
    setTimeout(() => setAddedOption(null), 2500);
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
                max="200"
                value={people}
                onChange={(e) => {
                  setShowResults(false);
                  setPeople(parseInt(e.target.value) || 1);
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
                  onClick={() => { setIsMainEvent(true); setShowResults(false); }}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    isMainEvent
                      ? "border-[#E10600] bg-[#E10600] text-white"
                      : "border-black bg-white text-black hover:border-[#E10600]"
                  }`}
                >
                  The Main Event
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMainEvent(false); setShowResults(false); }}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    !isMainEvent
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
              onClick={calculate}
              className="w-full bg-[#E10600] hover:bg-black text-white font-black py-4 px-6 uppercase tracking-tight border-4 border-black transition-colors text-xl"
            >
              Calculate Portions
            </button>

            {/* Results */}
            {showResults && (
              <div className="border-t-4 border-black pt-6 mt-6">
                <h4 className="font-black uppercase text-lg mb-4">Recommended Order:</h4>

                {/* Two options: main course with rawBig ≤ 4 */}
                {optionA && optionB && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 border-2 border-black">
                      <p className="font-black uppercase text-sm mb-2">Option 1: Big Boxes</p>
                      <p className="text-2xl font-black text-[#E10600] mb-1">{optionA.label}</p>
                      <p className="text-sm font-medium mb-3">Total: ${optionA.cost}</p>
                      {onAddToOrder && (
                        <button
                          type="button"
                          onClick={() => handleAdd("A")}
                          className={`w-full py-2 px-4 font-black uppercase text-sm border-2 transition-colors ${
                            addedOption === "A"
                              ? "bg-green-600 border-green-600 text-white"
                              : "bg-black border-black text-white hover:bg-[#E10600] hover:border-[#E10600]"
                          }`}
                        >
                          {addedOption === "A" ? "✓ ADDED! SCROLL DOWN TO CONTINUE" : "ADD OPTION 1 TO MY ORDER →"}
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 border-2 border-black">
                      <p className="font-black uppercase text-sm mb-2">Option 2: Party Box</p>
                      <p className="text-2xl font-black text-[#E10600] mb-1">{optionB.label}</p>
                      <p className="text-sm font-medium mb-3">Total: ${optionB.cost}</p>
                      {onAddToOrder && (
                        <button
                          type="button"
                          onClick={() => handleAdd("B")}
                          className={`w-full py-2 px-4 font-black uppercase text-sm border-2 transition-colors ${
                            addedOption === "B"
                              ? "bg-green-600 border-green-600 text-white"
                              : "bg-black border-black text-white hover:bg-[#E10600] hover:border-[#E10600]"
                          }`}
                        >
                          {addedOption === "B" ? "✓ ADDED! SCROLL DOWN TO CONTINUE" : "ADD OPTION 2 TO MY ORDER →"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Single recommendation: side dish or main when rawBig > 4 */}
                {singleRec && (
                  <div className="bg-gray-50 p-4 border-2 border-black">
                    <p className="font-black uppercase text-sm mb-2">Recommended:</p>
                    <p className="text-2xl font-black text-[#E10600] mb-1">{singleRec.label}</p>
                    <p className="text-sm font-medium mb-3">Total: ${singleRec.cost}</p>
                    {onAddToOrder && (
                      <button
                        type="button"
                        onClick={handleAddSingle}
                        className={`w-full py-2 px-4 font-black uppercase text-sm border-2 transition-colors ${
                          addedOption === "A"
                            ? "bg-green-600 border-green-600 text-white"
                            : "bg-black border-black text-white hover:bg-[#E10600] hover:border-[#E10600]"
                        }`}
                      >
                        {addedOption === "A" ? "✓ ADDED! SCROLL DOWN TO CONTINUE" : "ADD TO MY ORDER →"}
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-600 mt-4 italic">
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
