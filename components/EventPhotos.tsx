"use client";

export default function EventPhotos() {
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
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              className="aspect-square bg-gray-200 border-4 border-black flex items-center justify-center"
            >
              <div className="text-center p-2">
                <p className="text-xs font-black uppercase text-gray-600 mb-1">Event Photo {num}</p>
                <p className="text-xs text-gray-500">/public/images/event-{num}.jpg</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-medium">Add photos of parties, office gatherings, and events featuring BUBA</p>
        </div>
      </div>
    </div>
  );
}
