"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const router = useRouter();

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
    }
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) return;

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: "Fritz", password: pin }),
      });

      if (response.ok) {
        router.push("/admin");
      } else {
        setError("WA WAAAAAA! NO SECRET RECIPE FOR YOU!");
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin("");
        }, 1000);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className={`max-w-md w-full border-4 border-[#E10600] p-8 ${isShaking ? 'animate-shake' : ''}`}>
        <h1 className="text-3xl font-black uppercase text-center text-black mb-2">
          🔐 SECRET ZONE 🔐
        </h1>
        <p className="text-center text-black font-medium mb-6 text-sm">
          ENTER THE PIN TO DISCOVER THE TOP SECRET BUREKA RECIPE
        </p>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-14 h-14 border-4 border-black flex items-center justify-center text-3xl font-black"
            >
              {pin[i] ? "●" : ""}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 text-center">
            <p className="text-[#E10600] font-black text-lg uppercase animate-pulse">
              {error}
            </p>
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="h-16 border-4 border-black bg-white hover:bg-[#E10600] hover:text-white font-black text-2xl transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 border-4 border-black bg-white hover:bg-gray-200 font-black text-lg transition-colors"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleNumberClick("0")}
            className="h-16 border-4 border-black bg-white hover:bg-[#E10600] hover:text-white font-black text-2xl transition-colors"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            className="h-16 border-4 border-[#E10600] bg-[#E10600] hover:bg-white hover:text-[#E10600] text-white font-black text-lg transition-colors"
          >
            ENTER
          </button>
        </div>

        <a
          href="/"
          className="block text-center text-sm font-bold uppercase text-black hover:text-[#E10600] mt-4"
        >
          ← BACK TO ORDERS
        </a>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}
