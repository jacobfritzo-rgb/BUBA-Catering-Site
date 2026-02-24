"use client";

export default function HeroSection() {
  return (
    <div className="bg-[#E10600] text-white border-b-8 border-black">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tight mb-6">
            BUBA CATERING
          </h1>
          <p className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
            Fresh Burekas for Your Event
          </p>
          <p className="text-lg font-medium uppercase tracking-wide">
            72 Hour Advance Notice • Pickup or Delivery • All NYC Boroughs
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-black mb-12">
          <div className="bg-white text-black p-6 text-center">
            <div className="text-4xl font-black mb-1">500+</div>
            <div className="text-xs font-black uppercase tracking-wide">Events</div>
          </div>
          <div className="bg-white text-black p-6 text-center">
            <div className="text-4xl font-black mb-1">NYC</div>
            <div className="text-xs font-black uppercase tracking-wide">All Boroughs</div>
          </div>
          <div className="bg-white text-black p-6 text-center">
            <div className="text-4xl font-black mb-1">2010</div>
            <div className="text-xs font-black uppercase tracking-wide">Since</div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="#order-form"
            className="inline-block bg-black hover:bg-white text-white hover:text-black font-black py-6 px-16 text-2xl uppercase tracking-tight border-4 border-black transition-colors"
          >
            Order Now
          </a>
        </div>
      </div>
    </div>
  );
}
