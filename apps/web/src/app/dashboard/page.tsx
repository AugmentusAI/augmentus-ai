"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { API_BASE_URL } from "@/lib/api";

interface Prompt {
  id: number;
  rawPrompt: string;
  optimized?: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [loading, setLoading] = useState(false); // 🆕 global "add prompt" loading
  const [optimizingId, setOptimizingId] = useState<number | null>(null); // 🆕 per-prompt loader

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    const res = await fetchWithAuth(`${API_BASE_URL}/prompts`);
    if (res.ok) {
      setPrompts(await res.json());
    }
  }

  async function addPrompt() {
    if (!newPrompt.trim()) return;
    setLoading(true);
    await fetchWithAuth(`${API_BASE_URL}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawPrompt: newPrompt }),
    });
    setNewPrompt("");
    setLoading(false);
    loadPrompts();
  }

  async function deletePrompt(id: number) {
    await fetchWithAuth(`${API_BASE_URL}/prompts/${id}`, {
      method: "DELETE",
    });
    loadPrompts();
  }

  async function optimizePrompt(id: number) {
    setOptimizingId(id); // 🆕 start indicator
    const res = await fetchWithAuth(`${API_BASE_URL}/optimize/${id}`, {
      method: "POST",
    });
    setOptimizingId(null); // 🆕 stop indicator
    if (res.ok) loadPrompts();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Prompt Dashboard</h1>

      {/* Add Prompt */}
      <div className="flex space-x-2">
        <input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="Enter a new prompt..."
          className="flex-1 border rounded-lg p-2"
        />
        <button
          onClick={addPrompt}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </div>

      {/* Prompt List */}
      <div className="space-y-4">
        {prompts.map((p) => (
          <div
            key={p.id}
            className="border p-4 rounded-lg shadow-sm bg-white space-y-2"
          >
            <p className="font-medium text-gray-800">{p.rawPrompt}</p>
            {p.optimized && (
              <div className="p-3 bg-green-50 border-l-4 border-green-400 text-sm text-gray-700">
                <strong>Optimized:</strong> {p.optimized}
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => optimizePrompt(p.id)}
                disabled={optimizingId === p.id}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {optimizingId === p.id ? "Optimizing..." : "Optimize"}
              </button>
              <button
                onClick={() => deletePrompt(p.id)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}