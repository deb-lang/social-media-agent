"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ApprovalActions({
  postId,
  disabled,
  onChange,
}: {
  postId: string;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function approve() {
    setPending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/approve`, { method: "POST" });
      const payload = (await res.json()) as {
        ok?: boolean;
        scheduled_for?: string;
        error?: string;
      };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed to approve");
      toast.success("Approved", {
        description: payload.scheduled_for
          ? `Scheduled for ${new Date(payload.scheduled_for).toLocaleString()}`
          : undefined,
      });
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setPending(false);
    }
  }

  async function reject() {
    if (!feedback.trim()) {
      toast.error("Feedback is required for rejection.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        regenerated?: boolean;
        reason?: string;
        error?: string;
      };
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed to reject");
      if (payload.reason === "max_regenerations_reached") {
        toast.warning("Max regenerations reached — flagged for manual review.");
      } else if (payload.regenerated) {
        toast.success("Rejected. Regenerating with your feedback…");
      } else {
        toast.success("Rejected.");
      }
      setMode("idle");
      setFeedback("");
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setPending(false);
    }
  }

  if (mode === "rejecting") {
    return (
      <div className="flex flex-col gap-2 min-w-[260px]">
        <textarea
          autoFocus
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What should be different? (e.g., 'Make the stat more prominent', 'Change the CTA')"
          rows={4}
          disabled={pending}
          className="text-sm px-3 py-2 rounded-md border border-[#D4DBE1] bg-white text-[#153757] focus:outline-none focus:ring-2 focus:ring-[#74CCD3] disabled:opacity-50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reject}
            disabled={pending || !feedback.trim()}
            className="flex-1 text-sm px-3 py-2 rounded-md bg-[#B91C1C] text-white hover:bg-[#991515] disabled:opacity-50 font-medium"
          >
            {pending ? "Submitting…" : "Submit rejection"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setFeedback("");
            }}
            disabled={pending}
            className="text-sm px-3 py-2 rounded-md border border-[#D4DBE1] bg-white text-[#153757] hover:bg-[#F6F7F9] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-[140px]">
      <button
        type="button"
        onClick={approve}
        disabled={pending || disabled}
        className="text-sm px-4 py-2.5 rounded-md bg-[#153757] text-white hover:bg-[#0F2640] disabled:opacity-50 font-semibold"
      >
        {pending ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => setMode("rejecting")}
        disabled={pending || disabled}
        className="text-sm px-4 py-2.5 rounded-md border border-[#D4DBE1] bg-white text-[#153757] hover:bg-[#F6F7F9] disabled:opacity-50 font-medium"
      >
        Reject
      </button>
    </div>
  );
}
