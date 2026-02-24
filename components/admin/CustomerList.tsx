"use client";

import { useState } from "react";

interface Customer {
  email: string;
  name: string;
  phone: string;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  order_count: number;
  last_order_date: string;
  first_order_date: string;
}

interface PreorderExport {
  id: number;
  exported_at: string;
  phone_numbers: string[];
  customer_count: number;
  notes: string | null;
}

interface CustomerListProps {
  customers: Customer[];
  onExportComplete: () => void;
}

export default function CustomerList({ customers, onExportComplete }: CustomerListProps) {
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [exportNotes, setExportNotes] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exports, setExports] = useState<PreorderExport[]>([]);
  const [showExports, setShowExports] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Filter customers who opted into SMS
  const smsOptInCustomers = customers.filter(c => c.sms_opt_in);

  // Toggle individual phone selection
  const togglePhone = (phone: string) => {
    const newSelected = new Set(selectedPhones);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedPhones(newSelected);
  };

  // Select all SMS opt-in phones
  const selectAllSms = () => {
    const allPhones = new Set(smsOptInCustomers.map(c => c.phone));
    setSelectedPhones(allPhones);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPhones(new Set());
  };

  // Copy selected phone numbers to clipboard
  const copyToClipboard = async () => {
    const phoneList = Array.from(selectedPhones).join(", ");
    try {
      await navigator.clipboard.writeText(phoneList);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Mark phones as exported to pre-order company
  const markAsExported = async () => {
    if (selectedPhones.size === 0) {
      alert("Please select at least one phone number");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/customers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_numbers: Array.from(selectedPhones),
          notes: exportNotes || undefined,
        }),
      });

      if (response.ok) {
        alert(`✓ Marked ${selectedPhones.size} phone numbers as sent to pre-order company`);
        setSelectedPhones(new Set());
        setExportNotes("");
        onExportComplete();
        loadExports();
      } else {
        alert("Failed to save export record");
      }
    } catch (error) {
      console.error("Error marking export:", error);
      alert("Error saving export record");
    } finally {
      setIsExporting(false);
    }
  };

  // Load export history
  const loadExports = async () => {
    try {
      const response = await fetch("/api/customers/export");
      if (response.ok) {
        const data = await response.json();
        setExports(data);
      }
    } catch (error) {
      console.error("Error loading exports:", error);
    }
  };

  // Toggle export history view
  const toggleExports = async () => {
    if (!showExports) {
      await loadExports();
    }
    setShowExports(!showExports);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* SMS Opt-in Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            SMS Marketing List ({smsOptInCustomers.length} customers)
          </h3>
          <button
            onClick={toggleExports}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showExports ? "Hide" : "View"} Export History
          </button>
        </div>

        {smsOptInCustomers.length > 0 && (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAllSms}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Select All ({smsOptInCustomers.length})
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={copyToClipboard}
                disabled={selectedPhones.size === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPhones.size === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : copySuccess
                    ? "bg-green-600 text-white"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {copySuccess ? "✓ Copied!" : `Copy Selected (${selectedPhones.size})`}
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {smsOptInCustomers.map((customer) => (
                <label
                  key={customer.email}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPhones.has(customer.phone)
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPhones.has(customer.phone)}
                    onChange={() => togglePhone(customer.phone)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-600">{customer.phone}</div>
                    <div className="text-xs text-gray-500">
                      {customer.order_count} order{customer.order_count !== 1 ? "s" : ""} • Last: {formatDate(customer.last_order_date)}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {selectedPhones.size > 0 && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={exportNotes}
                  onChange={(e) => setExportNotes(e.target.value)}
                  placeholder="e.g., Sent to pre-order company for Spring 2024 campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={markAsExported}
                  disabled={isExporting}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? "Saving..." : `✓ Mark ${selectedPhones.size} Number${selectedPhones.size !== 1 ? "s" : ""} as Sent to Pre-Order Company`}
                </button>
              </div>
            )}
          </>
        )}

        {smsOptInCustomers.length === 0 && (
          <p className="text-gray-500 italic">No customers have opted into SMS marketing yet.</p>
        )}
      </div>

      {/* Export History */}
      {showExports && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Export History</h3>
          {exports.length === 0 ? (
            <p className="text-gray-500 italic">No exports yet.</p>
          ) : (
            <div className="space-y-3">
              {exports.map((exp) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {exp.customer_count} phone number{exp.customer_count !== 1 ? "s" : ""}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(exp.exported_at)}
                      </div>
                      {exp.notes && (
                        <div className="text-sm text-gray-500 mt-1 italic">{exp.notes}</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exp.phone_numbers.join(", "));
                        alert("Phone numbers copied!");
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                    {exp.phone_numbers.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Customers Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          All Customers ({customers.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marketing Opt-ins
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {customer.sms_opt_in && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          SMS
                        </span>
                      )}
                      {customer.email_opt_in && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Email
                        </span>
                      )}
                      {!customer.sms_opt_in && !customer.email_opt_in && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.order_count} order{customer.order_count !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-gray-500">Last: {formatDate(customer.last_order_date)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
