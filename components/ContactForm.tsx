"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !message) {
      setError("Please fill in your name, email, and message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white py-16 px-4 border-t-4 border-black">
        <div className="max-w-2xl mx-auto text-center">
          <div className="border-4 border-[#E10600] p-8">
            <h3 className="text-3xl font-black uppercase tracking-tight text-black mb-3">
              MESSAGE SENT!
            </h3>
            <p className="text-gray-700 font-medium">
              Thanks for reaching out. We&apos;ll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-16 px-4 border-t-4 border-black">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-3">
            Have a Question?
          </h2>
          <p className="text-sm font-medium text-gray-600">
            Not ready to order? Send us a message and we&apos;ll get back to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border-4 border-black bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
              NAME <span className="text-[#E10600]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
              EMAIL <span className="text-[#E10600]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
              PHONE (OPTIONAL)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-bold uppercase tracking-wide text-black mb-1">
              MESSAGE <span className="text-[#E10600]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black focus:border-[#E10600] focus:outline-none font-medium"
              rows={4}
              placeholder="Ask us about minimums, dietary options, delivery areas, or anything else..."
              required
            />
          </div>

          {error && (
            <div className="bg-white border-4 border-[#E10600] p-3">
              <p className="text-[#E10600] font-black uppercase tracking-wide text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black hover:bg-[#E10600] text-white font-black py-4 px-6 uppercase tracking-tight border-4 border-black transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "SENDING..." : "SEND MESSAGE →"}
          </button>
        </form>
      </div>
    </div>
  );
}
