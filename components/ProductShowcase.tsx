"use client";

export default function ProductShowcase() {
  return (
    <div className="bg-white py-16 px-4 border-b-4 border-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-black uppercase tracking-tight text-black mb-4">
            Choose Your Box
          </h2>
          <p className="text-sm font-medium uppercase tracking-wide">
            All boxes include crushed tomato, tahini, spicy schug, pickles & olives
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Party Box */}
          <div className="border-4 border-black">
            {/* Party Box Photo */}
            <div className="border-b-4 border-black">
              <img
                src="/images/party-box.jpg"
                alt="BUBA Party Box - 40 mini burekas"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="bg-[#E10600] text-white p-6 border-b-4 border-black">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-3xl font-black uppercase tracking-tight">
                  Party Box
                </h3>
                <span className="text-5xl font-black">$225</span>
              </div>
            </div>

            <div className="p-6 bg-white">
              <div className="space-y-2 mb-6 font-medium">
                <p>Serves 10-15 people</p>
                <p>40 mini burekas</p>
                <p>Choose 1-3 flavors</p>
              </div>

              <div className="border-t-2 border-black pt-4">
                <p className="text-xs font-black uppercase tracking-wide mb-2">
                  Includes:
                </p>
                <p className="text-sm">
                  Crushed tomato • Tahini • Spicy schug • Pickles • Olives
                </p>
              </div>
            </div>
          </div>

          {/* Big Box */}
          <div className="border-4 border-black">
            {/* Photo Placeholder */}
            <div className="bg-gray-200 h-64 flex items-center justify-center border-b-4 border-black">
              <div className="text-center p-4">
                <p className="text-xs font-black uppercase text-gray-600 mb-2">Photo: Big Box</p>
                <p className="text-xs text-gray-500">Add image at /public/images/big-box.jpg</p>
              </div>
            </div>

            <div className="bg-[#E10600] text-white p-6 border-b-4 border-black">
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-3xl font-black uppercase tracking-tight">
                  Big Box
                </h3>
                <span className="text-5xl font-black">$78</span>
              </div>
            </div>

            <div className="p-6 bg-white">
              <div className="space-y-2 mb-6 font-medium">
                <p>Feeds 4-6 people</p>
                <p>8 half-size burekas</p>
                <p>Choose 1-4 flavors</p>
              </div>

              <div className="border-t-2 border-black pt-4">
                <p className="text-xs font-black uppercase tracking-wide mb-2">
                  Includes:
                </p>
                <p className="text-sm">
                  Tahini • Crushed tomato • Spicy schug • Pickles • Olives • Jammy eggs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
