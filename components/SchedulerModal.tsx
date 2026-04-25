"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

interface SchedulerModalProps {
  postId: string;
  onClose: () => void;
  onScheduled?: () => void;
}

interface CalendarPost {
  id: string;
  status: string;
  scheduled_for: string | null;
}
interface CalendarResp {
  month: string;
  days: Record<string, CalendarPost[]>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SLOT_HOURS_PST = [9, 10, 11, 13]; // 9 AM, 10 AM, 11 AM, 1 PM PST

function monthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function pstDateAt(year: number, month1to12: number, day: number, hourPst: number): Date {
  // Construct a Date that represents `year-month-day hourPst:00 PST`.
  // PST = UTC-8, PDT = UTC-7. We use 17:00 UTC for 9 AM PST in winter, 16:00 UTC in summer.
  // Simpler: build a date in local TZ then format. For correctness, use the
  // server's expected ISO with explicit UTC offset.
  const offset = isPdt(year, month1to12, day) ? -7 : -8;
  // Convert hour PST → UTC by subtracting offset
  const utcHour = hourPst - offset; // hourPst + |offset|
  return new Date(Date.UTC(year, month1to12 - 1, day, utcHour, 0, 0));
}

function isPdt(year: number, month1to12: number, day: number): boolean {
  // PDT: 2nd Sun of March → 1st Sun of November
  const start = nthWeekdayOfMonth(year, 3, 0, 2); // 2nd Sunday of March
  const end = nthWeekdayOfMonth(year, 11, 0, 1); // 1st Sunday of November
  const d = new Date(Date.UTC(year, month1to12 - 1, day));
  return d >= start && d < end;
}

function nthWeekdayOfMonth(year: number, month1to12: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month1to12 - 1, 1 + offset + (n - 1) * 7));
}

export default function SchedulerModal({ postId, onClose, onScheduled }: SchedulerModalProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const monthParam = monthString(cursor);
  const [yr, mo] = monthParam.split("-").map(Number);

  const { data } = useSWR<CalendarResp>(`/api/analytics/calendar?month=${monthParam}`, fetcher);
  const days = data?.days ?? {};

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const monthLabel = new Date(Date.UTC(yr, mo - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Calendar grid
  const grid = useMemo(() => {
    const firstDay = new Date(Date.UTC(yr, mo - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
    const cells: Array<{ day: number | null; date: Date | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(Date.UTC(yr, mo - 1, d)) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, date: null });
    return cells;
  }, [yr, mo]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isPast(d: Date): boolean {
    return d.getTime() < today.getTime();
  }
  function isWeekend(d: Date): boolean {
    const w = d.getUTCDay();
    return w === 0 || w === 6;
  }

  const hoursTakenForSelected = useMemo(() => {
    if (!selectedDay) return new Set<number>();
    const dayPosts = days[String(selectedDay.getUTCDate())] ?? [];
    const hours = new Set<number>();
    for (const p of dayPosts) {
      if (!p.scheduled_for) continue;
      const dt = new Date(p.scheduled_for);
      // Approximate PST hour
      const pst = (dt.getUTCHours() - (isPdt(yr, mo, selectedDay.getUTCDate()) ? -7 : -8) + 24) % 24;
      hours.add(pst);
    }
    return hours;
  }, [selectedDay, days, yr, mo]);

  async function confirm() {
    if (!selectedDay || selectedHour == null) return;
    const iso = pstDateAt(
      selectedDay.getUTCFullYear(),
      selectedDay.getUTCMonth() + 1,
      selectedDay.getUTCDate(),
      selectedHour
    ).toISOString();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_for: iso }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      toast.success(`Scheduled for ${selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })} ${selectedHour}:00 PST`);
      onScheduled?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(21, 55, 87, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "88vh",
          background: "var(--surface)",
          borderRadius: 24,
          boxShadow: "0 30px 60px rgba(11, 45, 72, 0.32)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--navy)", margin: 0, letterSpacing: "-.01em" }}>
              When should this go live?
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Pick any open weekday slot — 9 AM, 10 AM, 11 AM, or 1 PM PST
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ width: 40, height: 40, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}
          >
            ×
          </button>
        </div>

        {/* Calendar */}
        <div style={{ padding: "20px 28px", flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => { setCursor(new Date(yr, mo - 2, 1)); setSelectedDay(null); setSelectedHour(null); }}
              className="btn"
              style={{ padding: "6px 12px" }}
            >
              ‹
            </button>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--navy)" }}>
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => { setCursor(new Date(yr, mo, 1)); setSelectedDay(null); setSelectedHour(null); }}
              className="btn"
              style={{ padding: "6px 12px" }}
            >
              ›
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 12 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {grid.map((cell, idx) => {
              if (!cell.day || !cell.date) {
                return <div key={idx} style={{ aspectRatio: "1/1" }} />;
              }
              const past = isPast(cell.date);
              const weekend = isWeekend(cell.date);
              const isSelected = selectedDay && cell.date.getTime() === selectedDay.getTime();
              const disabled = past || weekend;
              const hasPosts = (days[String(cell.day)] ?? []).length > 0;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  onClick={() => { setSelectedDay(cell.date); setSelectedHour(null); }}
                  style={{
                    aspectRatio: "1/1",
                    border: isSelected ? "2px solid var(--teal-dark)" : "1px solid var(--border)",
                    background: isSelected ? "var(--teal-dark)" : disabled ? "var(--bg)" : "var(--surface)",
                    color: isSelected ? "#fff" : disabled ? "var(--text-dim)" : "var(--navy)",
                    borderRadius: 8,
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    position: "relative",
                    opacity: disabled ? 0.5 : 1,
                    transition: "all var(--t-fast)",
                  }}
                >
                  {cell.day}
                  {hasPosts && !isSelected && (
                    <span style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: 999, background: "var(--teal-dark)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div style={{ marginTop: 22 }}>
              <div className="mini" style={{ margin: "0 0 10px" }}>
                Available slots — {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SLOT_HOURS_PST.map((h) => {
                  const taken = hoursTakenForSelected.has(h);
                  const active = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      disabled={taken}
                      onClick={() => setSelectedHour(h)}
                      className="chip"
                      style={{
                        background: active ? "var(--teal-dark)" : taken ? "var(--surface-hover)" : "var(--surface)",
                        color: active ? "#fff" : taken ? "var(--text-dim)" : "var(--navy)",
                        border: `1px solid ${active ? "var(--teal-dark)" : "var(--border)"}`,
                        cursor: taken ? "not-allowed" : "pointer",
                        textDecoration: taken ? "line-through" : "none",
                        padding: "8px 14px",
                        fontWeight: 600,
                      }}
                    >
                      {h === 12 ? "12:00 PM" : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`} PST
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            Times shown in PST · LinkedIn auto-converts
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button
              type="button"
              onClick={confirm}
              disabled={!selectedDay || selectedHour == null || submitting}
              className="btn teal"
            >
              {submitting
                ? "Scheduling…"
                : !selectedDay
                  ? "Pick a day"
                  : selectedHour == null
                    ? "Pick a time"
                    : `Schedule for ${selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${selectedHour > 12 ? `${selectedHour - 12}` : selectedHour}:00 ${selectedHour >= 12 ? "PM" : "AM"} PST`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
