"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { PostListRow, PostStatus } from "@/lib/posts-helpers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Filter = "" | PostStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

const CATEGORY_LABEL: Record<string, string> = {
  stat_post: "Stat",
  thought_leadership: "Thought leadership",
  missing_middle: "Missing middle",
  lead_magnet: "Lead magnet",
  perfectpatient: "PerfectPatient",
};

const STATUS_CLASS: Record<PostStatus, string> = {
  pending_review: "warn",
  approved: "info",
  rejected: "err",
  scheduled: "info",
  published: "ok",
  failed: "err",
};

function toCsv(posts: PostListRow[]): string {
  const header = [
    "id",
    "created_at",
    "status",
    "category",
    "format",
    "scheduled_for",
    "published_at",
    "caption",
    "hashtags",
    "impressions",
    "engagement_rate",
    "link_clicks",
    "originality_score",
    "compliance_status",
  ];
  const lines = [header.join(",")];
  for (const p of posts) {
    const row = [
      p.id,
      p.created_at,
      p.status,
      p.category,
      p.format,
      p.scheduled_for ?? "",
      p.published_at ?? "",
      `"${(p.caption ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${(p.hashtags ?? []).join(" ")}"`,
      p.impressions ?? "",
      p.engagement_rate ?? "",
      p.link_clicks ?? "",
      p.originality_score ?? "",
      p.compliance_status ?? "",
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("");
  const [search, setSearch] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams({ limit: "200" });
    if (filter) p.set("status", filter);
    return p.toString();
  }, [filter]);

  const { data, isLoading } = useSWR<{ posts: PostListRow[] }>(
    `/api/posts?${qs}`,
    fetcher,
    { refreshInterval: 60_000 }
  );

  // Counts for filter chips (run against unfiltered totals via a light call)
  const { data: allData } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?limit=200",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const counts = useMemo(() => {
    const all = allData?.posts ?? [];
    const byStatus = new Map<string, number>();
    for (const p of all) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    return {
      "": all.length,
      pending_review: byStatus.get("pending_review") ?? 0,
      scheduled: (byStatus.get("scheduled") ?? 0) + (byStatus.get("approved") ?? 0),
      published: byStatus.get("published") ?? 0,
      failed: (byStatus.get("failed") ?? 0) + (byStatus.get("rejected") ?? 0),
    };
  }, [allData]);

  // Client-side search filter
  const rows = useMemo(() => {
    const base = data?.posts ?? [];
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (p) =>
        p.caption.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.hashtags ?? []).some((h) => h.toLowerCase().includes(q))
    );
  }, [data, search]);

  function downloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patientpartner-posts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="section container">
      <span className="tag-eyebrow">Post history · / history</span>
      <div className="mini">All posts · filterable</div>
      <h2 className="page-title">Post history</h2>
      <p className="page-sub">
        Filter by status, category, or search. Click a row to expand the full
        preview. Export any slice to CSV.
      </p>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`fchip${filter === f.value ? " on" : ""}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            <span className="n">{counts[f.value as keyof typeof counts] ?? 0}</span>
          </button>
        ))}
        <div className="f-search">
          <input
            type="text"
            placeholder="Search caption, category, hashtags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            onClick={downloadCsv}
            disabled={rows.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            No posts match these filters.
          </p>
        </div>
      ) : (
        <div className="card tbl-card">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Format</th>
                <th>Caption</th>
                <th style={{ textAlign: "right" }}>Impressions</th>
                <th style={{ textAlign: "right" }}>Eng %</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: ".04em",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--navy)" }}>
                    {CATEGORY_LABEL[p.category] ?? p.category}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{p.format}</td>
                  <td className="cap">
                    {p.caption.split("\n")[0].slice(0, 70)}
                  </td>
                  <td className="num">
                    {p.impressions != null ? p.impressions.toLocaleString() : "—"}
                  </td>
                  <td className="num">
                    {p.engagement_rate != null ? `${p.engagement_rate}%` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`status ${STATUS_CLASS[p.status] ?? "neu"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
