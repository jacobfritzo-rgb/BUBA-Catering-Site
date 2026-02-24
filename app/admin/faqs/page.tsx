"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  display_order: number;
}

export default function FAQManagement() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ question: "", answer: "" });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    const res = await fetch("/api/faqs");
    const data = await res.json();
    setFaqs(data);
  };

  const handleCreate = async () => {
    await fetch("/api/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setFormData({ question: "", answer: "" });
    setIsCreating(false);
    fetchFAQs();
  };

  const handleUpdate = async (faq: FAQ) => {
    await fetch("/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(faq),
    });
    setEditingId(null);
    fetchFAQs();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this FAQ?")) {
      await fetch(`/api/faqs?id=${id}`, { method: "DELETE" });
      fetchFAQs();
    }
  };

  const moveUp = async (faq: FAQ, index: number) => {
    if (index === 0) return;
    const prev = faqs[index - 1];
    await fetch("/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...faq, display_order: prev.display_order }),
    });
    await fetch("/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...prev, display_order: faq.display_order }),
    });
    fetchFAQs();
  };

  const moveDown = async (faq: FAQ, index: number) => {
    if (index === faqs.length - 1) return;
    const next = faqs[index + 1];
    await fetch("/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...faq, display_order: next.display_order }),
    });
    await fetch("/api/faqs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, display_order: faq.display_order }),
    });
    fetchFAQs();
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight">FAQ Management</h1>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="bg-black text-white font-black px-6 py-2 uppercase tracking-tight border-4 border-black hover:bg-white hover:text-black transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="bg-[#E10600] text-white font-black px-6 py-3 uppercase tracking-tight border-4 border-[#E10600] hover:bg-white hover:text-[#E10600] transition-colors mb-6"
        >
          + Add New FAQ
        </button>

        {isCreating && (
          <div className="border-4 border-[#E10600] p-6 mb-6 bg-gray-50">
            <h3 className="font-black uppercase mb-4">New FAQ</h3>
            <input
              type="text"
              placeholder="Question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-2 border-2 border-black mb-3 font-medium"
            />
            <textarea
              placeholder="Answer"
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-4 py-2 border-2 border-black mb-3 font-medium"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="bg-[#E10600] text-white font-black px-6 py-2 uppercase tracking-tight border-2 border-[#E10600]"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setFormData({ question: "", answer: "" });
                }}
                className="bg-white text-black font-black px-6 py-2 uppercase tracking-tight border-2 border-black"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="border-4 border-black p-6">
              {editingId === faq.id ? (
                <>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f))}
                    className="w-full px-4 py-2 border-2 border-black mb-3 font-medium"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(e) => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f))}
                    className="w-full px-4 py-2 border-2 border-black mb-3 font-medium"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(faq)}
                      className="bg-[#E10600] text-white font-black px-6 py-2 uppercase tracking-tight border-2 border-[#E10600]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        fetchFAQs();
                      }}
                      className="bg-white text-black font-black px-6 py-2 uppercase tracking-tight border-2 border-black"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black uppercase text-lg">{faq.question}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveUp(faq, index)}
                        disabled={index === 0}
                        className="text-black font-black px-2 py-1 border-2 border-black disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(faq, index)}
                        disabled={index === faqs.length - 1}
                        className="text-black font-black px-2 py-1 border-2 border-black disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{faq.answer}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(faq.id)}
                      className="bg-black text-white font-black px-4 py-1 uppercase tracking-tight text-sm border-2 border-black"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="bg-[#E10600] text-white font-black px-4 py-1 uppercase tracking-tight text-sm border-2 border-[#E10600]"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
