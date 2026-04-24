"use client";

import { useState } from "react";
import { toast } from "sonner";

// Given an ISO timestamp, format for <input type="datetime-local"> in PST.
// `datetime-local` uses the browser's local time — we accept that and rely on
// the server to convert back to the America/Los_Angeles wall-clock via
// reviewer intent. If you want stricter PST-only input, render a custom picker
// later.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulePicker({
  postId,
  current,
  onSaved,
}: {
  postId: string;
  current: string | null;
  onSaved?: (iso: string) => void;
}) {
  const [value, setValue] = useState(toLocalInput(current));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value) {
      toast.error("Pick a date/time first.");
      return;
    }
    const iso = new Date(value).toISOString();
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_for: iso }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        scheduled_for?: string;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed to save");
      if (payload.warnings?.length) {
        payload.warnings.forEach((w) => toast.warning(w));
      }
      toast.success("Schedule updated");
      onSaved?.(payload.scheduled_for ?? iso);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="text-sm px-3 py-2 rounded-md border border-[#D4DBE1] bg-white text-[#153757] focus:outline-none focus:ring-2 focus:ring-[#74CCD3]"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || !value}
        className="text-sm px-3 py-2 rounded-md bg-[#153757] text-white hover:bg-[#0F2640] disabled:opacity-50 font-medium"
      >
        {saving ? "Saving…" : "Update"}
      </button>
    </div>
  );
}
