"use client";

import { useState } from "react";

export default function PortionCalculator() {
  const [people, setPeople] = useState<number>(10);
  const [isMainEvent, setIsMainEvent] = useState<boolean>(true);
  const [showResults, setShowResults] = useState(false);

  const calculate = () => {
    setShowResults(true);
  };

  // Calculation logic
  // Party Box: serves 10-15 people (40 pieces) as main, or 20-25 as side
  // Big Box: feeds 4-6 people (8 pieces) as main, or 8-10 as side
  const piecesPerPerson = isMainEvent ? 4 : 2;
  const totalPieces = people * piecesPerPerson;

  // Calculate box combinations
  const partyBoxes = Math.floor(totalPieces / 40);
  const remainingAfterParty = totalPieces % 40;
  const bigBoxes = Math.ceil(remainingAfterParty / 8);

  // Alternative: all big boxes
  const allBigBoxes = Math.ceil(totalPieces / 8);

  const totalCostOption1 = (partyBoxes * 225) + (bigBoxes * 78);
  const totalCostOption2 = allBigBoxes * 78;

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
                onChange={(e) => setPeople(parseInt(e.target.value) || 1)}
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
                  onClick={() => setIsMainEvent(true)}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    isMainEvent
                      ? 'border-[#E10600] bg-[#E10600] text-white'
                      : 'border-black bg-white text-black hover:border-[#E10600]'
                  }`}
                >
                  The Main Event
                </button>
                <button
                  type="button"
                  onClick={() => setIsMainEvent(false)}
                  className={`p-4 border-4 font-black uppercase transition-colors ${
                    !isMainEvent
                      ? 'border-[#E10600] bg-[#E10600] text-white'
                      : 'border-black bg-white text-black hover:border-[#E10600]'
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

                <div className="space-y-4">
                  {partyBoxes > 0 && (
                    <div className="bg-gray-50 p-4 border-2 border-black">
                      <p className="font-black uppercase text-sm mb-2">Option 1: Mixed Boxes</p>
                      <p className="text-2xl font-black text-[#E10600] mb-2">
                        {partyBoxes} Party Box{partyBoxes > 1 ? 'es' : ''} + {bigBoxes} Big Box{bigBoxes > 1 ? 'es' : ''}
                      </p>
                      <p className="text-sm font-medium">Total: ${totalCostOption1}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 border-2 border-black">
                    <p className="font-black uppercase text-sm mb-2">
                      {partyBoxes > 0 ? 'Option 2: All Big Boxes' : 'Recommended:'}
                    </p>
                    <p className="text-2xl font-black text-[#E10600] mb-2">
                      {allBigBoxes} Big Box{allBigBoxes > 1 ? 'es' : ''}
                    </p>
                    <p className="text-sm font-medium">Total: ${totalCostOption2}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-4 italic">
                  * These are estimates. Adjust based on your guests' appetites!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
