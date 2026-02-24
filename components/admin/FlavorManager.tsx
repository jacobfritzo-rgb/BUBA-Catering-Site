"use client";

import { useState } from "react";
import { Flavor } from "@/lib/types";

interface FlavorManagerProps {
  flavors: Flavor[];
  onUpdate: () => void;
}

export default function FlavorManager({ flavors, onUpdate }: FlavorManagerProps) {
  const [newFlavorName, setNewFlavorName] = useState("");
  const [newFlavorDescription, setNewFlavorDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingFlavor, setDeletingFlavor] = useState<string | null>(null);

  const addFlavor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setMessage("");

    try {
      const response = await fetch("/api/flavors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFlavorName,
          description: newFlavorDescription,
        }),
      });

      if (response.ok) {
        setMessage("Flavor added successfully");
        setNewFlavorName("");
        setNewFlavorDescription("");
        onUpdate();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to add flavor");
      }
    } catch (error) {
      setMessage("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const deleteFlavor = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" flavor?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/flavors", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage("Flavor deleted successfully");
        onUpdate();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to delete flavor");
      }
    } catch (error) {
      setMessage("Network error");
    }
  };

  const toggleAvailable = async (flavor: Flavor) => {
    setMessage("");

    try {
      // Note: The API doesn't support toggling availability yet
      // This would need a PATCH endpoint for flavors
      setMessage("Toggle availability not yet implemented");
    } catch (error) {
      setMessage("Network error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Flavor List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Available
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flavors.map((flavor) => (
              <tr key={flavor.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {flavor.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {flavor.description || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleAvailable(flavor)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      flavor.available ? "bg-green-600" : "bg-gray-300"
                    }`}
                    disabled
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flavor.available ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => deleteFlavor(flavor.name)}
                    disabled={deletingFlavor === flavor.name}
                    className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Flavor Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Flavor</h3>
        <form onSubmit={addFlavor} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Flavor Name *
            </label>
            <input
              id="name"
              type="text"
              value={newFlavorName}
              onChange={(e) => setNewFlavorName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={newFlavorDescription}
              onChange={(e) => setNewFlavorDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., feta, ricotta"
            />
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes("success") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isAdding}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "Add Flavor"}
          </button>
        </form>
      </div>
    </div>
  );
}
