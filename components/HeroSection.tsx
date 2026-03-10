"use client";

export default function HeroSection() {
  return (
    <div className="bg-[#E10600] text-white border-b-8 border-black">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tight mb-6">
            BUBA BUREKA CATERING
          </h1>
          <p className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
            Crispy, fresh-baked burekas for your next event
          </p>
          <p className="text-lg font-medium uppercase tracking-wide">
            48 Hour Advance Notice Recommended • Pickup or Delivery • NYC
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-black mb-12">
          <div className="bg-white text-black p-6 text-center flex items-center justify-center min-h-[5rem]">
            <p className="text-base font-black uppercase tracking-tight leading-tight">You can have it all!</p>
          </div>
          <div className="bg-black text-white p-6 text-center flex items-center justify-center min-h-[5rem]">
            <p className="text-3xl font-black uppercase tracking-tight">NYC #1</p>
          </div>
          <div className="bg-white text-black p-6 text-center flex items-center justify-center min-h-[5rem]">
            <p className="text-base font-black uppercase tracking-tight leading-tight">Baked daily</p>
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
