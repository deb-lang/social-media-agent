"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import SchedulerModal from "./SchedulerModal";
import type { PostListRow } from "@/lib/posts-helpers";

interface RecommendRow {
  category: string;
  confidence: "high" | "low" | "insufficient";
  rank: number | null;
  reasoning: string;
}
interface RecommendResp {
  rankings: RecommendRow[];
  eligible_count: number;
}
const recFetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  { value: "lead_magnet", label: "Lead magnet" },
  { value: "stat_post", label: "Stat post" },
  { value: "thought_leadership", label: "Thought leadership" },
  { value: "missing_middle", label: "Missing middle" },
  { value: "perfectpatient", label: "PerfectPatient" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75; // 5 min

type Pending = null | "regenerate" | "schedule" | "post_now" | "delete";

export default function ManualPostForm() {
  const [context, setContext] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [category, setCategory] = useState<CategoryValue>("lead_magnet");
  const [format, setFormat] = useState<"image" | "carousel">("image");
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [generatedPost, setGeneratedPost] = useState<PostListRow | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [regenMode, setRegenMode] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");
  const [justRegenerated, setJustRegenerated] = useState(false);

  // Performance recommender — surface up to 3 high-confidence categories.
  const { data: rec } = useSWR<RecommendResp>("/api/analytics/recommend", recFetcher);
  const recommendedTop3 = (rec?.rankings ?? [])
    .filter((r) => r.confidence === "high" && r.rank != null && r.rank <= 3)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const charCount = context.length;
  const charValid = charCount >= 50 && charCount <= 2500;

  function addUrl() {
    if (urls.length < 5) setUrls([...urls, ""]);
  }
  function removeUrl(idx: number) {
    setUrls(urls.filter((_, i) => i !== idx));
  }
  function updateUrl(idx: number, value: string) {
    setUrls(urls.map((u, i) => (i === idx ? value : u)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!charValid) {
      toast.error("Context must be 50–2500 characters");
      return;
    }
    setSubmitting(true);
    setGeneratedPost(null);
    try {
      const res = await fetch("/api/posts/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: context.trim(),
          reference_urls: urls.map((u) => u.trim()).filter((u) => u.length > 0),
          category,
          format,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      setRunId(payload.run_id);
      setPollCount(0);
      toast.success("Generation kicked off — usually 30–90 seconds");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start generation");
      setSubmitting(false);
    }
  }

  // Poll for the generated post
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        const data = await res.json();
        if (cancelled) return;
        const status = data?.run?.status;
        if (status === "completed") {
          // Find the just-created post (most recent for this run)
          const postsRes = await fetch(`/api/posts?run_id=${runId}&limit=1`);
          const postsData = await postsRes.json();
          const post = (postsData?.posts ?? [])[0] as PostListRow | undefined;
          if (post) {
            setGeneratedPost(post);
            setRunId(null);
            setSubmitting(false);
            toast.success("Post ready");
          } else {
            // Run completed but no post returned — likely all posts failed
            setRunId(null);
            setSubmitting(false);
            toast.error("Generation finished but produced no post — check Slack for errors");
          }
          return;
        }
        if (status === "failed") {
          setRunId(null);
          setSubmitting(false);
          toast.error(data?.run?.error_message ?? "Generation failed");
          return;
        }
        // still in_progress
        if (pollCount >= MAX_POLLS) {
          setRunId(null);
          setSubmitting(false);
          toast.error("Timed out waiting for generation");
          return;
        }
        setPollCount((c) => c + 1);
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, pollCount]);

  function resetForm() {
    setContext("");
    setUrls([""]);
    setCategory("lead_magnet");
    setFormat("image");
    setGeneratedPost(null);
    setShowScheduler(false);
    setRegenMode(false);
    setRegenFeedback("");
    setJustRegenerated(false);
    setPending(null);
  }

  async function postNow() {
    if (!generatedPost) return;
    if (!confirm("Publish to LinkedIn now? This bypasses the review queue.")) return;
    setPending("post_now");
    try {
      const res = await fetch(`/api/posts/${generatedPost.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_now: true }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      toast.success(payload.dev_mode ? "Approved (DEV_MODE — Publer skipped)" : "Publishing now…");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPending(null);
    }
  }

  async function deletePost() {
    if (!generatedPost) return;
    if (!confirm("Delete this post permanently? The audit log of prior actions will be preserved.")) return;
    setPending("delete");
    try {
      const res = await fetch(`/api/posts/${generatedPost.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: regenFeedback.trim() || null }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      toast.success("Deleted");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setPending(null);
    }
  }

  async function regenerate() {
    if (!generatedPost) return;
    if (!regenFeedback.trim()) {
      toast.error("Tell Claude what should be different.");
      return;
    }
    setPending("regenerate");
    try {
      const res = await fetch(`/api/posts/${generatedPost.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: regenFeedback.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      if (payload.reason === "max_regenerations_reached") {
        toast.warning("Max regenerations reached — delete instead.");
        return;
      }
      // Refetch the (same id) post — its assets and caption have been swapped.
      const fresh = await fetch(`/api/posts/${generatedPost.id}`);
      const freshData = await fresh.json();
      if (freshData?.post) {
        setGeneratedPost(freshData.post as PostListRow);
      }
      setJustRegenerated(true);
      setRegenMode(false);
      setRegenFeedback("");
      toast.success("Regenerated with your feedback");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setPending(null);
    }
  }

  // ─── Result view ──────────────────────────────────
  if (generatedPost) {
    const busy = pending !== null;
    return (
      <div className="card" style={{ padding: 28, marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            Post ready
          </h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {justRegenerated && <span className="chip warn">Regenerated</span>}
            <span className="status ok">Ready</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "flex-start" }}>
          <div className="preview stat" style={{ aspectRatio: "1/1", borderRadius: 14, overflow: "hidden", position: "relative" }}>
            {generatedPost.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={generatedPost.image_url} alt="Post preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : generatedPost.carousel_slide_previews && generatedPost.carousel_slide_previews[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={generatedPost.carousel_slide_previews[0]} alt="Carousel slide 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#fff", textAlign: "center", padding: 20 }}>No preview</div>
            )}
          </div>
          <div>
            <div className="tags" style={{ marginBottom: 10 }}>
              <span className="chip">{generatedPost.category}</span>
              <span className="chip neu">{generatedPost.format === "carousel" ? "Carousel · PDF" : "Image · 1200×1200"}</span>
              {generatedPost.compliance_status === "pass" && <span className="chip" style={{ background: "var(--success-bg)", color: "var(--success)" }}>Compliance pass</span>}
              {generatedPost.rejection_count > 0 && (
                <span className="chip warn">Regen ×{generatedPost.rejection_count}</span>
              )}
            </div>
            <p className="cap" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>
              {generatedPost.caption}
            </p>
            <p className="cap hash">{generatedPost.hashtags?.join(" ")}</p>
          </div>
        </div>

        {/* Inline regenerate panel */}
        {regenMode && (
          <div style={{ marginTop: 22, padding: 16, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-hover)" }}>
            <label style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
              What should be different?
            </label>
            <textarea
              autoFocus
              rows={3}
              value={regenFeedback}
              onChange={(e) => setRegenFeedback(e.target.value)}
              disabled={pending === "regenerate"}
              placeholder="e.g., Make the stat more prominent. Lead with the cost, not the time. Tighten the second paragraph."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn"
                onClick={() => { setRegenMode(false); setRegenFeedback(""); }}
                disabled={pending === "regenerate"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn teal"
                onClick={regenerate}
                disabled={pending === "regenerate" || !regenFeedback.trim()}
              >
                {pending === "regenerate" ? "Regenerating… (30–60s)" : "Submit & regenerate"}
              </button>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          {/* Trash icon — left, subtle, matches PostCard.tsx delete styling */}
          <button
            type="button"
            onClick={deletePost}
            disabled={busy}
            title="Delete post"
            aria-label="Delete post"
            style={{
              background: "transparent",
              border: "1px solid transparent",
              color: "var(--text-dim)",
              padding: 8,
              borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: pending === "delete" ? 0.5 : 1,
              transition: "color 150ms, border-color 150ms, background 150ms",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (busy) return;
              e.currentTarget.style.color = "#B54A44";
              e.currentTarget.style.borderColor = "#F5C8C8";
              e.currentTarget.style.background = "#FDECEC";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={resetForm} disabled={busy}>
              Generate another
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setRegenMode((m) => !m)}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {regenMode ? "Hide feedback" : "Regenerate"}
            </button>
            <button
              type="button"
              className="btn teal"
              onClick={() => setShowScheduler(true)}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Schedule
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={postNow}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {pending === "post_now" ? "Publishing…" : "Post now"}
            </button>
          </div>
        </div>

        {showScheduler && (
          <SchedulerModal
            postId={generatedPost.id}
            onClose={() => setShowScheduler(false)}
            onScheduled={() => {
              toast.success("Scheduled");
              resetForm();
            }}
          />
        )}
      </div>
    );
  }

  // ─── Form view ───────────────────────────────────
  return (
    <form className="card" style={{ padding: 28, marginTop: 22 }} onSubmit={handleSubmit}>
      {/* Context */}
      <div style={{ marginBottom: 22 }}>
        <label style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
          Context
          <span style={{ float: "right", color: charValid ? "var(--text-dim)" : "var(--error)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500 }}>
            {charCount} / 2500
          </span>
        </label>
        <textarea
          rows={5}
          placeholder="What's this post about? Topic, occasion, links, dates, anything that makes it specific. The more concrete, the better."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--text)",
            lineHeight: 1.6,
            resize: "vertical",
            transition: "border-color var(--t-fast)",
          }}
        />
        <p style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 6 }}>
          Eg. &ldquo;Q2 webinar on patient mentor RCT outcomes — June 18, 1pm ET. Register at patientpartner.com/q2-webinar&rdquo;
        </p>
      </div>

      {/* Reference links */}
      <div style={{ marginBottom: 22 }}>
        <label style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
          Reference links <span style={{ fontWeight: 500, color: "var(--text-dim)" }}>(optional)</span>
        </label>
        {urls.map((url, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ color: "var(--teal-dark)", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              type="url"
              placeholder="https://patientpartner.com/..."
              value={url}
              onChange={(e) => updateUrl(idx, e.target.value)}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--text)",
              }}
            />
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrl(idx)}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                }}
                aria-label="Remove URL"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {urls.length < 5 && (
          <button
            type="button"
            onClick={addUrl}
            disabled={submitting}
            className="btn"
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            + Add link
          </button>
        )}
      </div>

      {/* Recommender hint — top categories by recent performance */}
      {recommendedTop3.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "var(--success-bg)", border: "1px solid #BCE7CB" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
            Trending · last 90 days
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {recommendedTop3.map((r) => {
              const label = CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category;
              const active = category === r.category;
              return (
                <button
                  key={r.category}
                  type="button"
                  onClick={() => setCategory(r.category as CategoryValue)}
                  disabled={submitting}
                  className="chip"
                  title={r.reasoning}
                  style={{
                    background: active ? "var(--navy)" : "var(--surface)",
                    color: active ? "#fff" : "var(--navy)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  #{r.rank} · {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category + Format */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
            Category
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                disabled={submitting}
                className="chip"
                style={{
                  background: category === cat.value ? "var(--navy)" : "var(--surface-hover)",
                  color: category === cat.value ? "#fff" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>
            Format
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["image", "carousel"] as const).map((f) => {
              const active = format === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  disabled={submitting}
                  style={{
                    padding: "14px 16px",
                    border: active ? "2px solid var(--teal-dark)" : "1px solid var(--border)",
                    borderRadius: 12,
                    background: active ? "var(--light-teal)" : "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    transition: "all var(--t-fast)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>
                    {f === "image" ? "Image" : "Carousel"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {f === "image" ? "1200×1200 · single PNG" : "1080×1350 · 3-5 slides PDF"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generate CTA */}
      <button
        type="submit"
        className="btn primary"
        disabled={!charValid || submitting}
        style={{
          width: "100%",
          height: 52,
          fontSize: 15,
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        {submitting ? (
          <>
            <span className="spinner" style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Generating… (30–90s)
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Generate post
          </>
        )}
      </button>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
