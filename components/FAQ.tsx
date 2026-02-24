"use client";

import { useState, useEffect } from "react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  display_order: number;
}

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/faqs")
      .then((res) => res.json())
      .then((data) => setFaqs(data))
      .catch((err) => console.error("Error fetching FAQs:", err));
  }, []);

  if (faqs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white py-16 px-4 border-t-4 border-black">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-black uppercase tracking-tight text-black mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="border-4 border-black overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <span className="font-black uppercase tracking-tight text-black pr-4">
                  {faq.question}
                </span>
                <span className={`text-2xl font-black text-[#E10600] transition-transform flex-shrink-0 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}>
                  ↓
                </span>
              </button>

              {openIndex === index && (
                <div className="bg-gray-50 p-4 border-t-4 border-black">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
