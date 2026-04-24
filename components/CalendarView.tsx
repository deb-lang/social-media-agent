"use client";

import type { PostStatus } from "@/lib/posts-helpers";

interface CalendarPost {
  id: string;
  status: PostStatus;
  category: string;
  format: string;
  scheduled_for: string | null;
  published_at: string | null;
  caption: string;
}

const STATUS_COLOR: Record<PostStatus, string> = {
  pending_review: "bg-[#F3E0A5]",
  approved: "bg-[#A4C3F2]",
  rejected: "bg-[#F5C8C8]",
  scheduled: "bg-[#BEB7F5]",
  published: "bg-[#74CCD3]",
  failed: "bg-[#B91C1C]",
};

export default function CalendarView({
  year,
  month,
  days,
  onPrev,
  onNext,
}: {
  year: number;
  month: number; // 1-indexed
  days: Record<string, CalendarPost[]>;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Build 6-week grid (42 cells) starting on Sunday
  const firstDay = firstOfMonth.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ day: number | null; posts: CalendarPost[] }> = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, posts: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = String(d).padStart(2, "0");
    cells.push({ day: d, posts: days[key] ?? [] });
  }
  while (cells.length < 42) cells.push({ day: null, posts: [] });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const isCurrentMonth =
    today.getUTCFullYear() === year && today.getUTCMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getUTCDate() : -1;

  return (
    <div className="bg-white border border-[#E8ECEF] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECEF]">
        <button
          type="button"
          onClick={onPrev}
          className="text-sm px-3 py-1.5 rounded-md border border-[#D4DBE1] bg-white text-[#153757] hover:bg-[#F6F7F9]"
        >
          ← Prev
        </button>
        <h2 className="font-[Manrope,sans-serif] font-semibold text-lg text-[#153757]">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={onNext}
          className="text-sm px-3 py-1.5 rounded-md border border-[#D4DBE1] bg-white text-[#153757] hover:bg-[#F6F7F9]"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-[#E8ECEF]">
        {weekdays.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] uppercase tracking-wider text-[#8A9AAD] font-semibold"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`min-h-[100px] p-2 border-b border-r border-[#E8ECEF] ${
              cell.day === null ? "bg-[#FAFAF7]" : "bg-white"
            } ${i % 7 === 6 ? "border-r-0" : ""}`}
          >
            {cell.day !== null && (
              <>
                <div
                  className={`text-xs font-semibold mb-1 ${
                    cell.day === todayDay
                      ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#153757] text-white"
                      : "text-[#153757]"
                  }`}
                >
                  {cell.day}
                </div>
                <div className="flex flex-wrap gap-1">
                  {cell.posts.slice(0, 6).map((p) => (
                    <span
                      key={p.id}
                      className={`w-2 h-2 rounded-full ${STATUS_COLOR[p.status] ?? "bg-[#8A9AAD]"}`}
                      title={`${p.category} · ${p.status} · ${p.caption.slice(0, 80)}`}
                    />
                  ))}
                  {cell.posts.length > 6 && (
                    <span className="text-[10px] text-[#8A9AAD]">
                      +{cell.posts.length - 6}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-[#FAFAF7] border-t border-[#E8ECEF] text-xs text-[#536A82]">
        <Legend color="bg-[#F3E0A5]" label="Pending" />
        <Legend color="bg-[#BEB7F5]" label="Scheduled" />
        <Legend color="bg-[#74CCD3]" label="Published" />
        <Legend color="bg-[#B91C1C]" label="Failed" />
        <Legend color="bg-[#F5C8C8]" label="Rejected" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
