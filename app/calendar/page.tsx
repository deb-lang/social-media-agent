"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
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

interface CalendarResp {
  month: string;
  days: Record<string, CalendarPost[]>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_PILL_CLASS: Record<PostStatus, string> = {
  pending_review: "pen",
  approved: "sch",
  rejected: "fail",
  scheduled: "sch",
  published: "pub",
  failed: "fail",
};

function monthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const monthParam = monthString(cursor);
  const [year, month] = monthParam.split("-").map(Number);

  const { data, isLoading } = useSWR<CalendarResp>(
    `/api/analytics/calendar?month=${monthParam}`,
    fetcher,
    { refreshInterval: 120_000 }
  );

  const days = data?.days ?? {};

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Month summary
  const summary = useMemo(() => {
    const all = Object.values(days).flat();
    return {
      published: all.filter((p) => p.status === "published").length,
      scheduled: all.filter((p) => p.status === "scheduled").length,
      pending: all.filter((p) => p.status === "pending_review").length,
      failed: all.filter((p) => p.status === "failed").length,
    };
  }, [days]);

  // Upcoming (next 5 scheduled or pending)
  const upcoming = useMemo(() => {
    const all = Object.entries(days)
      .flatMap(([day, posts]) =>
        posts.map((p) => ({ ...p, day: parseInt(day, 10) }))
      )
      .filter((p) => p.status === "scheduled" || p.status === "pending_review")
      .sort((a, b) => a.day - b.day)
      .slice(0, 5);
    return all;
  }, [days]);

  // Grid cells
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = new Date();
  const isCurrentMonth =
    today.getUTCFullYear() === year && today.getUTCMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getUTCDate() : -1;

  const cells: Array<{ day: number | null; posts: CalendarPost[] }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, posts: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = String(d).padStart(2, "0");
    cells.push({ day: d, posts: days[key] ?? [] });
  }
  while (cells.length < 42) cells.push({ day: null, posts: [] });

  function prev() {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  }
  function next() {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  }

  return (
    <section className="section container">
      <span className="tag-eyebrow">Content calendar · / calendar</span>
      <div className="mini">Month at a glance</div>
      <h2 className="page-title">
        Every post, every slot, <span className="accent">every cron.</span>
      </h2>
      <p className="page-sub">
        Published, scheduled, and pending posts laid out on the calendar.
        Click any post to open the queue item.
      </p>

      <div className="cal-head" style={{ marginTop: 32 }}>
        <div className="cal-nav">
          <button aria-label="Previous month" onClick={prev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="cal-month">{monthLabel}</div>
          <button aria-label="Next month" onClick={next}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <div className="cal-legend">
          <span className="lg">
            <span className="sw pub" /> Published
          </span>
          <span className="lg">
            <span className="sw sch" /> Scheduled
          </span>
          <span className="lg">
            <span className="sw pen" /> Pending
          </span>
          <span className="lg">
            <span className="sw fail" /> Failed
          </span>
          <span className="lg">
            <span className="sw run" /> Cron run
          </span>
        </div>
      </div>

      {isLoading && Object.keys(days).length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          Loading calendar…
        </div>
      ) : (
        <div className="cal-layout">
          <div className="cal-grid">
            <div className="cal-dow">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="dow">
                  {d}
                </div>
              ))}
            </div>
            <div className="cal-body">
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className={`cal-cell ${cell.day === null ? "out" : ""} ${cell.day === todayDay ? "today" : ""}`}
                >
                  {cell.day !== null && (
                    <>
                      <div className="cal-daynum">{cell.day}</div>
                      {cell.posts.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className={`cal-pill ${STATUS_PILL_CLASS[p.status] ?? "sch"}`}
                        >
                          <div className="pt">
                            {p.status === "published"
                              ? "Published"
                              : p.status === "scheduled"
                                ? "Scheduled"
                                : p.status === "pending_review"
                                  ? "Pending"
                                  : p.status}
                          </div>
                          <div className="pc">
                            {p.caption.split("\n")[0].slice(0, 36)}
                          </div>
                        </div>
                      ))}
                      {cell.posts.length > 4 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-mono)",
                            marginTop: 2,
                          }}
                        >
                          +{cell.posts.length - 4} more
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="cal-side">
            <div className="cal-side-card">
              <h4>Upcoming this month</h4>
              <div className="cs-sub">Next scheduled posts</div>
              {upcoming.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Nothing upcoming yet.
                </div>
              ) : (
                upcoming.map((p) => (
                  <div key={p.id} className="cal-up-row">
                    <div className="cal-up-date">
                      <div className="m">{monthLabel.slice(0, 3).toUpperCase()}</div>
                      <div className="d">{p.day}</div>
                    </div>
                    <div className="cal-up-body">
                      <div className="ut">{p.caption.split("\n")[0].slice(0, 60)}</div>
                      <div className="um">
                        {p.category} · {p.format}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="cal-side-card">
              <h4>Month summary</h4>
              <div className="cs-sub">{monthLabel}</div>
              <div className="cal-stat-row">
                <span className="k">Posts published</span>
                <span className="v">{summary.published}</span>
              </div>
              <div className="cal-stat-row">
                <span className="k">Scheduled</span>
                <span className="v">{summary.scheduled}</span>
              </div>
              <div className="cal-stat-row">
                <span className="k">Pending review</span>
                <span className="v">{summary.pending}</span>
              </div>
              <div className="cal-stat-row">
                <span className="k">Failed</span>
                <span className="v">{summary.failed}</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
