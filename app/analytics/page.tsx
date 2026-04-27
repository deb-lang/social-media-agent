"use client";

import useSWR from "swr";

interface RecommendationRow {
  category: string;
  sample_size: number;
  total_impressions: number;
  weighted_engagement_rate: number | null;
  confidence: "high" | "low" | "insufficient";
  rank: number | null;
  reasoning: string;
}

interface RecommendResp {
  rankings: RecommendationRow[];
  eligible_count: number;
  total_count: number;
  generated_at: string;
  window_days: number;
}

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
    post_count: number;
  }>;
  best: {
    id: string;
    category: string;
    format: string;
    caption: string;
    impressions: number | null;
    engagement_rate: number | null;
    link_clicks: number | null;
  } | null;
  worst: SummaryResp["best"];
  by_category: Array<{
    category: string;
    post_count: number;
    avg_impressions: number;
    avg_engagement_rate: number;
    total_clicks: number;
  }>;
  by_format: Array<{
    format: string;
    post_count: number;
    avg_impressions: number;
    avg_engagement_rate: number;
  }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORY_LABEL: Record<string, string> = {
  stat_post: "Stat",
  thought_leadership: "Thought leadership",
  missing_middle: "Missing middle",
  lead_magnet: "Lead magnet",
  perfectpatient: "PerfectPatient",
};

const CATEGORY_COLOR: Record<string, string> = {
  stat_post: "#0F9A95",
  thought_leadership: "#2563EB",
  missing_middle: "#B7E4E7",
  lead_magnet: "#74CCD3",
  perfectpatient: "#188F8B",
};

function formatNum(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Build a smooth path for perf charts
function perfBarsSvg(values: number[]): { bars: Array<{ x: number; w: number; h: number }>; max: number } {
  if (!values.length) return { bars: [], max: 0 };
  const max = Math.max(...values, 1);
  const w = 100 / values.length;
  return {
    bars: values.map((v, i) => ({
      x: i * w + w * 0.15,
      w: w * 0.7,
      h: (v / max) * 100,
    })),
    max,
  };
}

export default function AnalyticsPage() {
  const { data, isLoading } = useSWR<SummaryResp>(
    "/api/analytics/summary",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const { data: rec } = useSWR<RecommendResp>(
    "/api/analytics/recommend",
    fetcher,
    { refreshInterval: 300_000 }
  );

  const trend = data?.trend ?? [];
  const categories = data?.by_category ?? [];
  const formats = data?.by_format ?? [];

  // Top posts by engagement
  const topPosts = categories.length && data
    ? [data.best, data.worst].filter(Boolean).slice(0, 4)
    : [];

  const impressionsBars = perfBarsSvg(trend.map((t) => t.impressions));
  const engagementBars = perfBarsSvg(trend.map((t) => t.engagement_rate_avg));

  // Format mix %
  const totalFormatPosts = formats.reduce((sum, f) => sum + f.post_count, 0);
  const formatMix = formats.map((f) => ({
    name: f.format,
    pct: totalFormatPosts > 0 ? Math.round((f.post_count / totalFormatPosts) * 100) : 0,
  }));

  const totalCatPosts = categories.reduce((sum, c) => sum + c.post_count, 0);
  const categoryMix = categories.map((c) => ({
    name: CATEGORY_LABEL[c.category] ?? c.category,
    key: c.category,
    pct: totalCatPosts > 0 ? Math.round((c.post_count / totalCatPosts) * 100) : 0,
  }));

  return (
    <section className="section container">
      <span className="tag-eyebrow">Post analytics · / analytics</span>
      <div className="mini">What&apos;s working</div>
      <h2 className="page-title">
        Real results. <span className="accent">Real impact.</span>
      </h2>
      <p className="page-sub">
        Which posts drove the most meaningful engagement, and which formats and
        categories are pulling their weight.
      </p>

      {isLoading && !data ? (
        <div className="card" style={{ marginTop: 22, textAlign: "center" }}>
          Loading analytics…
        </div>
      ) : trend.length === 0 ? (
        <div className="card" style={{ marginTop: 22, textAlign: "center", padding: "48px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>No published posts yet.</p>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>
            Analytics populate after the first post publishes and syncs.
          </p>
        </div>
      ) : (
        <>
          {/* Performance hero */}
          <div className="pg">
            <div className="card pcard">
              <div className="phead">
                <h3>Impressions</h3>
                <span className="ptrend">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M7 17l10-10M17 7h-5M17 7v5" />
                  </svg>
                  Monthly
                </span>
              </div>
              <div className="psub">Last {trend.length} months</div>
              <div className="pbig">{formatNum(data!.summary.impressions)}</div>
              <div className="pchart">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  {impressionsBars.bars.map((b, i) => (
                    <rect
                      key={i}
                      className="bar"
                      x={b.x}
                      y={100 - b.h}
                      width={b.w}
                      height={b.h}
                      fill="#188F8B"
                      rx="1"
                    />
                  ))}
                </svg>
              </div>
            </div>
            <div className="card pcard">
              <div className="phead">
                <h3>Engagement rate</h3>
                <span className="ptrend">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M7 17l10-10M17 7h-5M17 7v5" />
                  </svg>
                  avg
                </span>
              </div>
              <div className="psub">Last {trend.length} months</div>
              <div className="pbig">{data!.summary.engagement_rate_avg}%</div>
              <div className="pchart">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  {engagementBars.bars.map((b, i) => (
                    <rect
                      key={i}
                      className="bar"
                      x={b.x}
                      y={100 - b.h}
                      width={b.w}
                      height={b.h}
                      fill="#0F9A95"
                      rx="1"
                    />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* What to generate next — performance recommender */}
          <div className="card" style={{ marginTop: 22 }}>
            <div className="card-head">
              <h3 className="card-title">
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>
                What to generate next
              </h3>
              <span className="card-meta">
                Last 90 days · {rec?.eligible_count ?? 0} of 5 categories eligible
              </span>
            </div>
            {!rec ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading recommendations…</p>
            ) : rec.eligible_count === 0 ? (
              <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>
                  Need 5+ published posts and 50+ impressions per category before recommendations are reliable.
                </p>
                <p style={{ margin: "6px 0 0", color: "var(--text-dim)", fontSize: 12 }}>
                  {rec.total_count} published posts in window · waiting for more data.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rec.rankings
                  .slice()
                  .sort((a, b) => {
                    // High confidence + ranked first; insufficient last
                    if (a.confidence === "insufficient" && b.confidence !== "insufficient") return 1;
                    if (b.confidence === "insufficient" && a.confidence !== "insufficient") return -1;
                    return (a.rank ?? 99) - (b.rank ?? 99);
                  })
                  .map((row) => {
                    const tone =
                      row.confidence === "high"
                        ? "ok"
                        : row.confidence === "low"
                          ? "warn"
                          : "neu";
                    const isWinner = row.confidence === "high" && (row.rank ?? 99) <= 3;
                    return (
                      <div
                        key={row.category}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 14,
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: isWinner ? "var(--success-bg)" : "var(--surface-hover)",
                          border: isWinner ? "1px solid #BCE7CB" : "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            letterSpacing: ".06em",
                            color: "var(--text-dim)",
                            minWidth: 24,
                            textAlign: "center",
                          }}
                        >
                          {row.rank ? `#${row.rank}` : "—"}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>
                            {CATEGORY_LABEL[row.category] ?? row.category}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {row.reasoning}
                          </div>
                        </div>
                        <span
                          className={`status ${tone}`}
                          style={{ padding: "3px 8px", textTransform: "uppercase", letterSpacing: ".04em", fontSize: 10.5 }}
                        >
                          {row.confidence === "insufficient" ? "Need more data" : row.confidence}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Leaderboard + Mix */}
          <div className="ag">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                  Top performing posts
                </h3>
                <span className="card-meta">Last 30 days · by engagement</span>
              </div>
              {topPosts.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  No ranked data yet.
                </p>
              ) : (
                topPosts.map(
                  (p, i) =>
                    p && (
                      <div key={p.id} className="lb-row">
                        <div className={`rank ${i === 0 ? "top" : ""}`}>{i + 1}</div>
                        <div>
                          <div className="lb-title">
                            &ldquo;{p.caption.split("\n")[0].slice(0, 80)}…&rdquo;
                          </div>
                          <div className="lb-meta">
                            {p.format} · {CATEGORY_LABEL[p.category] ?? p.category}
                          </div>
                        </div>
                        <div className="lb-num">
                          <span className="n">
                            {p.impressions != null ? formatNum(p.impressions) : "—"}
                          </span>
                          <span className="u">Impressions</span>
                        </div>
                        <div className="lb-num">
                          <span className="n">
                            {p.engagement_rate != null ? `${p.engagement_rate}%` : "—"}
                          </span>
                          <span className="u">Engagement</span>
                        </div>
                      </div>
                    )
                )
              )}
            </div>

            <div className="card mix">
              <div className="card-head">
                <h3 className="card-title">
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                  </span>
                  Format &amp; category mix
                </h3>
                <span className="card-meta">Last 30 days</span>
              </div>
              <div className="mini" style={{ margin: "0 0 8px" }}>By format</div>
              {formatMix.map((f) => (
                <div key={f.name}>
                  <div className="row">
                    <span className="nm">
                      <span
                        className="sw"
                        style={{
                          background: f.name === "image" ? "#188F8B" : "#153757",
                        }}
                      />
                      {f.name === "image" ? "Image" : "Carousel"}
                    </span>
                    <span className="pct">{f.pct}%</span>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${f.pct}%`,
                        background: f.name === "image" ? "#188F8B" : "#153757",
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="mini" style={{ margin: "22px 0 8px" }}>By category</div>
              {categoryMix.map((c) => (
                <div key={c.key}>
                  <div className="row">
                    <span className="nm">
                      <span className="sw" style={{ background: CATEGORY_COLOR[c.key] ?? "#74CCD3" }} />
                      {c.name}
                    </span>
                    <span className="pct">{c.pct}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${c.pct}%`, background: CATEGORY_COLOR[c.key] ?? "#74CCD3" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
