"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function GenerateButton() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const { run_id } = await res.json();
      toast.success("Generation started", {
        description: `Run ${run_id.slice(0, 8)} running. Check the queue in ~2 minutes.`,
      });
    } catch (error) {
      toast.error("Generation failed to start", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="nav-cta"
    >
      {loading ? "Starting…" : "Generate Batch"}
      <svg
        className="arr"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    </button>
  );
}
