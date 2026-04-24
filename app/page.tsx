"use client";

import Link from "next/link";
import useSWR from "swr";
import type { PostListRow } from "@/lib/posts-helpers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SummaryResp {
  summary: {
    month: string;
    post_count: number;
    impressions: number;
    engagement_rate_avg: number;
    link_clicks: number;
    follower_delta: number;
  };
  trend: Array<{
    month: string;
    impressions: number;
    engagement_rate_avg: number;
    link_clicks: number;
    follower_delta: number;
  }>;
}

function formatNum(n: number | undefined | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function sparklinePoints(values: number[]): string {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 32 - ((v - min) / range) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function DashboardHome() {
  const { data: pending } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=pending_review&limit=10",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const { data: scheduled } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=scheduled&limit=5",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: published } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=published&limit=6",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: analytics } = useSWR<SummaryResp>(
    "/api/analytics/summary",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const pendingPosts = pending?.posts ?? [];
  const scheduledPosts = scheduled?.posts ?? [];
  const publishedPosts = published?.posts ?? [];
  const summary = analytics?.summary;
  const trend = analytics?.trend ?? [];

  const nextScheduled = scheduledPosts[0];
  const recent = [...pendingPosts, ...scheduledPosts, ...publishedPosts].slice(0, 6);

  // Sparkline series
  const impSeries = sparklinePoints(trend.map((t) => t.impressions));
  const engSeries = sparklinePoints(trend.map((t) => t.engagement_rate_avg));
  const clkSeries = sparklinePoints(trend.map((t) => t.link_clicks));
  const folSeries = sparklinePoints(trend.map((t) => t.follower_delta));

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <>
      {/* Hero */}
      <section className="section hero container">
        <span className="tag-eyebrow">Dashboard · / overview</span>
        <div className="hero-top" style={{ marginTop: 18 }}>
          PatientPartner · Marketing Ops · {today}
        </div>
        <h1>
          Autonomous LinkedIn content,
          <span className="accent">approved by humans.</span>
        </h1>
        <p>
          Generates two posts bi-monthly, schedules approved ones for the next
          Tuesday 9 AM or Thursday 10 AM PST slot.
        </p>
        <div className="hero-meta">
          <div className="m">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {nextScheduled
              ? `Next scheduled · ${formatDate(nextScheduled.scheduled_for ?? "")}`
              : "Next run · bi-monthly at 8 AM PST"}
          </div>
          <div className="m">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l3-9 4 18 3-9h4" />
            </svg>
            System healthy · Publisher ready
          </div>
          <div className="m">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Publishing Tue 9 AM · Thu 10 AM PST
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="section container">
        <span className="tag-eyebrow">At a glance · / snapshot</span>
        <div className="mini">Right now</div>
        <h2 className="page-title">
          {pendingPosts.length > 0
            ? `${pendingPosts.length} post${pendingPosts.length === 1 ? "" : "s"} pending your approval.`
            : "Queue is clear."}
        </h2>
        <p className="page-sub">
          Everything on deck for the next publish windows — the review queue,
          the next scheduled run, and this month's lift so far.
        </p>

        {pendingPosts.length > 0 && (
          <div className="alert">
            <div className="num">{pendingPosts.length}</div>
            <div className="bd">
              <h3>
                {pendingPosts.length} post{pendingPosts.length === 1 ? "" : "s"} awaiting review
              </h3>
              <p>
                Approve by the next publish window to ship on time — Tue 9 AM / Thu 10 AM PST.
              </p>
            </div>
            <Link href="/queue" className="btn primary">
              Review now →
            </Link>
          </div>
        )}

        <div className="bento">
          <div className="card span-2">
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <rect x="7" y="11" width="3" height="7" />
                    <rect x="12" y="7" width="3" height="11" />
                    <rect x="17" y="14" width="3" height="4" />
                  </svg>
                </span>
                This month
              </h3>
              <span className="card-meta">
                {summary?.month ?? ""} · through today
              </span>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-label">Impressions</div>
                <div className="stat-row">
                  <span className="stat-num">{formatNum(summary?.impressions)}</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Engagement rate</div>
                <div className="stat-row">
                  <span className="stat-num">
                    {summary?.engagement_rate_avg != null
                      ? `${summary.engagement_rate_avg}%`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Link clicks</div>
                <div className="stat-row">
                  <span className="stat-num">{formatNum(summary?.link_clicks)}</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Follower growth</div>
                <div className="stat-row">
                  <span className="stat-num">
                    {summary?.follower_delta != null
                      ? summary.follower_delta >= 0
                        ? `+${formatNum(summary.follower_delta)}`
                        : formatNum(summary.follower_delta)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card cadence">
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                Cadence
              </h3>
            </div>
            <div className="big">Bi-monthly</div>
            <div className="sub">2 posts per run · 1st & 15th</div>
            <hr />
            <div className="slots-label">Publish slots</div>
            <div className="slots">Tue 9:00 AM · Thu 10:00 AM PST</div>
            <div className="next">
              NEXT RUN · BI-MONTHLY 8:00 AM PST
            </div>
          </div>
        </div>

        <div className="bento" style={{ marginTop: 20 }}>
          <Link href="/queue" className="card mini-kpi" style={{ textDecoration: "none" }}>
            <div className="k-lab">Queue</div>
            <div className="k-num">{pendingPosts.length}</div>
            <div className="k-foot">
              <span>Awaiting review</span>
              <span className="k-link">View →</span>
            </div>
          </Link>
          <div className="card mini-kpi">
            <div className="k-lab">Published</div>
            <div className="k-num">{publishedPosts.length}</div>
            <div className="k-foot">
              <span>Recent batch</span>
            </div>
          </div>
          <div className="card mini-kpi">
            <div className="k-lab">Scheduled</div>
            <div className="k-num">{scheduledPosts.length}</div>
            <div className="k-foot">
              <span>In Publer queue</span>
              <span className="status ok">Healthy</span>
            </div>
          </div>
        </div>

        <div className="mini">Top analytics preview · last 6 months</div>
        <div className="spark-grid">
          <div className="spark">
            <div className="lab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Impressions
            </div>
            <div className="val">{formatNum(summary?.impressions ?? 0)}</div>
            <div className="dl">{trend.length > 0 ? `${trend.length}mo trend` : "no data"}</div>
            <svg className="line" viewBox="0 0 100 36" preserveAspectRatio="none">
              {impSeries && (
                <polyline fill="none" stroke="#188F8B" strokeWidth="2.5" strokeLinecap="round" points={impSeries} />
              )}
            </svg>
          </div>
          <div className="spark">
            <div className="lab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Engagement rate
            </div>
            <div className="val">
              {summary?.engagement_rate_avg != null ? `${summary.engagement_rate_avg}%` : "—"}
            </div>
            <div className="dl">{trend.length > 0 ? "avg across 6mo" : "no data"}</div>
            <svg className="line" viewBox="0 0 100 36" preserveAspectRatio="none">
              {engSeries && (
                <polyline fill="none" stroke="#0F9A95" strokeWidth="2.5" strokeLinecap="round" points={engSeries} />
              )}
            </svg>
          </div>
          <div className="spark">
            <div className="lab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-1 1" />
                <path d="M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l1-1" />
              </svg>
              Link clicks
            </div>
            <div className="val">{formatNum(summary?.link_clicks ?? 0)}</div>
            <div className="dl">cumulative</div>
            <svg className="line" viewBox="0 0 100 36" preserveAspectRatio="none">
              {clkSeries && (
                <polyline fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" points={clkSeries} />
              )}
            </svg>
          </div>
          <div className="spark">
            <div className="lab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Follower growth
            </div>
            <div className="val">
              {summary?.follower_delta != null
                ? summary.follower_delta >= 0
                  ? `+${formatNum(summary.follower_delta)}`
                  : formatNum(summary.follower_delta)
                : "—"}
            </div>
            <div className="dl">MoM</div>
            <svg className="line" viewBox="0 0 100 36" preserveAspectRatio="none">
              {folSeries && (
                <polyline fill="none" stroke="#1B7A3E" strokeWidth="2.5" strokeLinecap="round" points={folSeries} />
              )}
            </svg>
          </div>
        </div>

        {/* Next scheduled + Platform status */}
        <div className="bento" style={{ marginTop: 22 }}>
          <div className="card next-sched span-2">
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                Next scheduled post
              </h3>
              {nextScheduled && (
                <span className="card-meta">
                  {nextScheduled.scheduled_for
                    ? new Date(nextScheduled.scheduled_for).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "America/Los_Angeles",
                        timeZoneName: "short",
                      })
                    : ""}
                </span>
              )}
            </div>
            {nextScheduled ? (
              <div className="ns-grid">
                <div className="ns-thumb">
                  {nextScheduled.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nextScheduled.image_url}
                      alt="Next scheduled"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                    />
                  ) : nextScheduled.stat_value ? (
                    <div>
                      <div className="ns-num">{nextScheduled.stat_value}</div>
                      <div className="ns-cap">
                        {(nextScheduled.caption ?? "").split("\n")[0].slice(0, 80)}
                      </div>
                      {nextScheduled.stat_source && (
                        <div className="ns-src">{nextScheduled.stat_source}</div>
                      )}
                    </div>
                  ) : (
                    <div className="ns-cap" style={{ fontSize: 14 }}>
                      {(nextScheduled.caption ?? "").split("\n")[0].slice(0, 80)}
                    </div>
                  )}
                </div>
                <div className="ns-bd">
                  <div className="ns-tags">
                    <span className="chip">{nextScheduled.category}</span>
                    <span className="chip neu">{nextScheduled.format}</span>
                    <span className="status ok">Approved · ready to ship</span>
                  </div>
                  <p className="ns-cap-p">
                    {nextScheduled.caption.split("\n").slice(0, 2).join(" ").slice(0, 240)}
                    {nextScheduled.caption.length > 240 ? "…" : ""}
                  </p>
                  <div className="ns-count">
                    <div className="ns-count-row">
                      <div>
                        <div className="ns-count-lab">Status</div>
                        <div className="ns-count-v">Scheduled</div>
                      </div>
                      <div>
                        <div className="ns-count-lab">Approved</div>
                        <div className="ns-count-v">
                          {nextScheduled.approved_at
                            ? new Date(nextScheduled.approved_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="ns-count-lab">Publer ID</div>
                        <div className="ns-count-v">
                          {nextScheduled.publer_post_id
                            ? `#${String(nextScheduled.publer_post_id).slice(0, 6)}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="ns-progress">
                      <i style={{ width: "35%" }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 14 }}>
                No posts scheduled yet. Approve pending reviews to queue the next one.
              </p>
            )}
          </div>

          <div className="card plat">
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                Platforms
              </h3>
              <span className="card-meta">3 channels · 1 live</span>
            </div>
            <div className="plat-row on">
              <div className="plat-ic li">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.23 0z" />
                </svg>
              </div>
              <div className="plat-bd">
                <div className="plat-name">LinkedIn</div>
                <div className="plat-sub">Company page · PatientPartner</div>
              </div>
              <span className="plat-dot live" />
              <div className="plat-toggle on">
                <i />
              </div>
            </div>
            <div className="plat-row">
              <div className="plat-ic x">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="plat-bd">
                <div className="plat-name">
                  X <span className="plat-tag">Phase 2</span>
                </div>
                <div className="plat-sub">Port later · separate account</div>
              </div>
              <span className="plat-dot idle" />
              <div className="plat-toggle">
                <i />
              </div>
            </div>
            <div className="plat-row">
              <div className="plat-ic fb">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.791-4.683 4.533-4.683 1.314 0 2.686.235 2.686.235v2.964h-1.513c-1.49 0-1.956.929-1.956 1.882v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                </svg>
              </div>
              <div className="plat-bd">
                <div className="plat-name">
                  Facebook <span className="plat-tag">Phase 2</span>
                </div>
                <div className="plat-sub">Same Publer connection</div>
              </div>
              <span className="plat-dot idle" />
              <div className="plat-toggle">
                <i />
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bento" style={{ marginTop: 22, gridTemplateColumns: "1fr" }}>
          <div className="card recent">
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                Recent activity
              </h3>
              <Link href="/history" className="act-more">
                View all history →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                No activity yet. Click Generate Batch to create your first posts.
              </p>
            ) : (
              <ul className="act-feed">
                {recent.map((p) => (
                  <li key={p.id} className="act-row">
                    <div className={`act-ic ${p.status === "published" ? "pub" : p.status === "scheduled" ? "info" : "cron"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
                      </svg>
                    </div>
                    <div className="act-bd">
                      <p className="act-t">
                        <strong>{p.category.replace(/_/g, " ")}</strong>
                        {" · "}
                        <em>{(p.caption ?? "").split("\n")[0].slice(0, 120)}</em>
                      </p>
                      <div className="act-m">
                        {p.format} · {p.status.replace(/_/g, " ")}
                      </div>
                    </div>
                    <span className="act-time">{formatDate(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
