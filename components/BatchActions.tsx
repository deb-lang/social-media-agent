"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function BatchActions({
  selectedIds,
  totalCount,
  onAllSelected,
  onCleared,
  onApproved,
}: {
  selectedIds: string[];
  totalCount: number;
  onAllSelected: () => void;
  onCleared: () => void;
  onApproved?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const n = selectedIds.length;

  async function approveSelected() {
    if (n === 0) return;
    setPending(true);
    try {
      const res = await fetch("/api/posts/batch-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const payload = (await res.json()) as {
        approved?: number;
        failed?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? `http ${res.status}`);
      toast.success(`Approved ${payload.approved ?? 0}${payload.failed ? ` · ${payload.failed} failed` : ""}`);
      onApproved?.();
      onCleared();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch approve failed");
    } finally {
      setPending(false);
    }
  }

  if (totalCount === 0) return null;

  return (
    <div className="sticky top-16 z-40 mb-6 px-5 py-3 bg-white rounded-xl border border-[#E8ECEF] shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={n === totalCount && n > 0}
          onChange={(e) => (e.target.checked ? onAllSelected() : onCleared())}
          className="w-4 h-4 accent-[#153757]"
          aria-label="Select all"
        />
        <span className="text-sm text-[#536A82]">
          {n === 0
            ? `${totalCount} post${totalCount === 1 ? "" : "s"} in queue`
            : `${n} of ${totalCount} selected`}
        </span>
      </div>

      {n > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCleared}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-md border border-[#D4DBE1] bg-white text-[#153757] hover:bg-[#F6F7F9] disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={approveSelected}
            disabled={pending}
            className="text-sm px-4 py-1.5 rounded-md bg-[#153757] text-white hover:bg-[#0F2640] disabled:opacity-50 font-semibold"
          >
            {pending ? "Approving…" : `Approve ${n} selected`}
          </button>
        </div>
      )}
    </div>
  );
}
