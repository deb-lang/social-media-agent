"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

interface HealthCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

interface HealthResp {
  status: "ok" | "degraded";
  checks: HealthCheck[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function findCheck(checks: HealthCheck[], name: string): HealthCheck | undefined {
  return checks.find((c) => c.name === name);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default function SettingsPage() {
  const { data, mutate } = useSWR<HealthResp>("/api/health", fetcher, {
    refreshInterval: 60_000,
  });
  const [running, setRunning] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<Record<string, string>>({});

  const checks = data?.checks ?? [];
  const supabase = findCheck(checks, "supabase");
  const anthropic = findCheck(checks, "env:ANTHROPIC_API_KEY");
  const publerKey = findCheck(checks, "env:PUBLER_API_KEY");
  const publerWs = findCheck(checks, "env:PUBLER_WORKSPACE_ID");
  const publerAcct = findCheck(checks, "env:PUBLER_LINKEDIN_ACCOUNT_ID");
  const slack = findCheck(checks, "env:SLACK_WEBHOOK_URL");
  const cron = findCheck(checks, "env:CRON_SECRET");
  const publerOk = publerKey?.ok && publerWs?.ok && publerAcct?.ok;

  async function runManual(label: string, url: string) {
    setRunning(label);
    try {
      const res = await fetch(url, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `http ${res.status}`);
      toast.success(`${label} done`, {
        description: JSON.stringify(payload).slice(0, 140),
      });
      await mutate();
    } catch (err) {
      toast.error(`${label} failed`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(null);
    }
  }

  async function verifyIntegration(name: string) {
    setVerifying(name);
    try {
      // Always re-run /api/health; Publer additionally pulls fresh insights.
      const tasks: Array<Promise<unknown>> = [mutate()];
      if (name === "Publer" || name === "LinkedIn") {
        tasks.push(
          fetch("/api/analytics/sync", { method: "POST" }).then((r) => r.json())
        );
      }
      const [, syncResult] = await Promise.all(tasks);
      setVerifiedAt((prev) => ({ ...prev, [name]: new Date().toISOString() }));
      const desc =
        syncResult && typeof syncResult === "object"
          ? `synced ${(syncResult as { synced?: number }).synced ?? 0} · failed ${(syncResult as { failed?: number }).failed ?? 0}`
          : "Health probe re-run";
      toast.success(`${name} verified`, { description: desc });
    } catch (err) {
      toast.error(`${name} verify failed`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setVerifying(null);
    }
  }

  function showRotateHint(name: string, envVar: string | undefined) {
    const which = envVar || "the env var";
    toast.info(`Rotate ${name}`, {
      description: `Update ${which} in Vercel → Settings → Environment Variables, then redeploy. Token rotation from this UI is not wired yet.`,
      duration: 7000,
    });
  }

  const integrations: Array<{
    logo: string;
    short: string;
    name: string;
    detail: string;
    ok: boolean | undefined;
    missing?: string;
  }> = [
    {
      logo: "cl",
      short: "AN",
      name: "Anthropic",
      detail: "Claude Opus 4.7 · content generation · prompt caching",
      ok: anthropic?.ok,
      missing: "ANTHROPIC_API_KEY",
    },
    {
      logo: "sb",
      short: "SB",
      name: "Supabase",
      detail: "Postgres + Storage · 4 tables + post-assets bucket",
      ok: supabase?.ok,
      missing: supabase?.detail,
    },
    {
      logo: "pu",
      short: "PU",
      name: "Publer",
      detail: "LinkedIn scheduler · Business plan API access",
      ok: publerOk,
      missing: [
        !publerKey?.ok && "PUBLER_API_KEY",
        !publerWs?.ok && "PUBLER_WORKSPACE_ID",
        !publerAcct?.ok && "PUBLER_LINKEDIN_ACCOUNT_ID",
      ]
        .filter(Boolean)
        .join(", "),
    },
    {
      logo: "li",
      short: "LI",
      name: "LinkedIn",
      detail: "Company page · PatientPartner · routed via Publer",
      ok: publerOk,
    },
    {
      logo: "sk",
      short: "SK",
      name: "Slack",
      detail: "#social-media-agent · ready-for-review + failure alerts",
      ok: slack?.ok,
      missing: "SLACK_WEBHOOK_URL",
    },
    {
      logo: "vc",
      short: "VC",
      name: "Vercel cron",
      detail: "3 schedules · generate · analytics sync · recycle scan",
      ok: cron?.ok,
      missing: "CRON_SECRET (optional in dev)",
    },
  ];

  return (
    <section className="section container">
      <span className="tag-eyebrow">System · / settings</span>
      <div className="mini">Connections &amp; ops</div>
      <h2 className="page-title">
        Wired and <span className="accent">watching.</span>
      </h2>
      <p className="page-sub">
        Integration status, manual triggers, and the pipeline from cron fire
        to LinkedIn publish.
      </p>

      <div className="intg">
        {integrations.map((i) => {
          const isVerifying = verifying === i.name;
          const lastVerified = verifiedAt[i.name];
          const syncable = i.name === "Publer" || i.name === "LinkedIn";
          return (
            <div
              key={i.name}
              className="card int"
              role="button"
              tabIndex={0}
              onClick={() => !isVerifying && verifyIntegration(i.name)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isVerifying) {
                  e.preventDefault();
                  verifyIntegration(i.name);
                }
              }}
              style={{
                cursor: isVerifying ? "wait" : "pointer",
                position: "relative",
                opacity: isVerifying ? 0.7 : 1,
                transition: "opacity 150ms",
              }}
              aria-label={`${i.name} — click to ${syncable ? "sync and re-verify" : "re-verify"}`}
            >
              <div className="int-head">
                <div className={`int-logo ${i.logo}`}>{i.short}</div>
                <div style={{ minWidth: 0 }}>
                  <p className="int-name">{i.name}</p>
                  <p className="int-meta">{i.detail}</p>
                </div>
              </div>
              {!i.ok && i.missing && (
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--warning)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: ".03em",
                    lineHeight: 1.4,
                  }}
                >
                  Missing: {i.missing}
                </p>
              )}
              <div className="int-foot">
                <strong>{i.ok ? "Connected" : "Not configured"}</strong>
                <span
                  className={`status ${i.ok ? "ok" : "warn"}`}
                  style={{ padding: "3px 8px" }}
                >
                  {isVerifying ? "Verifying…" : i.ok ? "Live" : "Pending"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  letterSpacing: ".06em",
                  color: "var(--text-dim)",
                }}
              >
                <span>
                  {lastVerified
                    ? `Verified ${timeAgo(lastVerified)}`
                    : syncable
                      ? "Click to sync"
                      : "Click to verify"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showRotateHint(i.name, i.missing?.split(",")[0]?.trim());
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                  title="Rotate token (placeholder)"
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--teal-dark)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
                >
                  Rotate
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mini" style={{ marginTop: 44 }}>
        Manual triggers
      </div>
      <div className="card" style={{ padding: "24px 28px" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
          Same endpoints the crons call. Useful for testing the pipeline before
          the next scheduled run.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => runManual("Generate batch", "/api/generate")}
            disabled={running === "Generate batch"}
          >
            {running === "Generate batch" ? "Running…" : "Generate batch"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => runManual("Analytics sync", "/api/analytics/sync")}
            disabled={running === "Analytics sync"}
          >
            {running === "Analytics sync" ? "Running…" : "Sync analytics"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => runManual("Scrape resources", "/api/scrape/resources")}
            disabled={running === "Scrape resources"}
          >
            {running === "Scrape resources" ? "Running…" : "Scrape resources"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => runManual("Recycle scan", "/api/recycle/scan")}
            disabled={running === "Recycle scan"}
          >
            {running === "Recycle scan" ? "Running…" : "Scan for recyclables"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => runManual("Weekly digest", "/api/analytics/digest")}
            disabled={running === "Weekly digest"}
          >
            {running === "Weekly digest" ? "Running…" : "Send weekly digest"}
          </button>
        </div>
        <p
          style={{
            marginTop: 16,
            fontSize: 11.5,
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            letterSpacing: ".04em",
          }}
        >
          DEV_MODE=true in .env.local short-circuits Publer — no real LinkedIn post.
        </p>
      </div>

      <div className="mini" style={{ marginTop: 44 }}>
        Pipeline
      </div>
      <div className="flow">
        <div className="fl">
          <div className="n">1</div>
          <h4>Cron fires</h4>
          <p>Vercel scheduler triggers /api/generate bi-monthly at 8 AM PST.</p>
        </div>
        <div className="fl">
          <div className="n">2</div>
          <h4>Content engine</h4>
          <p>Scraper + Claude web-search picks fresh stats. Category rotation picks 2 angles.</p>
        </div>
        <div className="fl">
          <div className="n">3</div>
          <h4>Claude generates</h4>
          <p>Opus 4.7 · cached 5K voice prompt · Zod-validated JSON.</p>
        </div>
        <div className="fl">
          <div className="n">4</div>
          <h4>Quality gates</h4>
          <p>Compliance → self-review → plagiarism → UTM injection.</p>
        </div>
        <div className="fl">
          <div className="n">5</div>
          <h4>Render + upload</h4>
          <p>SVG → PNG via resvg. Carousel → PDF via pdf-lib. Uploaded to Supabase.</p>
        </div>
        <div className="fl">
          <div className="n">6</div>
          <h4>Slack alert</h4>
          <p>&ldquo;N posts ready for review&rdquo; fires with a /queue deep link.</p>
        </div>
        <div className="fl">
          <div className="n">7</div>
          <h4>Human approves</h4>
          <p>Reviewer approves (or rejects with feedback → regen, max 3×).</p>
        </div>
        <div className="fl">
          <div className="n">8</div>
          <h4>Publer schedules</h4>
          <p>Upload media · schedule post · poll job · write publer_post_id.</p>
        </div>
        <div className="fl">
          <div className="n">9</div>
          <h4>Analytics sync</h4>
          <p>Daily weekday cron pulls insights from Publer → dashboard charts.</p>
        </div>
        <div className="fl">
          <div className="n">10</div>
          <h4>Evergreen recycle</h4>
          <p>Monthly scan picks high-performers 90+ days old and regenerates with a fresh hook.</p>
        </div>
      </div>
    </section>
  );
}
