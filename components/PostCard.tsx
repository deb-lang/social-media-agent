"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import type { PostListRow } from "@/lib/posts-helpers";
import PostPreviewModal from "./PostPreviewModal";

const CATEGORY_LABEL: Record<string, string> = {
  stat_post: "Stat post",
  thought_leadership: "Thought leadership",
  missing_middle: "Missing middle",
  lead_magnet: "Lead magnet",
  perfectpatient: "PerfectPatient",
};

function formatSlot(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  });
}

export default function PostCard({
  post,
  onChange,
}: {
  post: PostListRow;
  onChange?: () => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [pending, setPending] = useState<null | "approve" | "reject" | "delete" | "retry">(null);
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [feedback, setFeedback] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  async function deletePost() {
    if (!confirm("Delete this post permanently? The audit log of prior actions will be preserved.")) {
      return;
    }
    setPending("delete");
    try {
      const res = await fetch(`/api/posts/${post.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: feedback.trim() || null }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed");
      toast.success("Deleted");
      setMode("idle");
      setFeedback("");
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  const isCarousel = post.format === "carousel";
  const slides = post.carousel_slide_previews ?? [];
  const nSlides = slides.length;

  async function approve() {
    setPending("approve");
    try {
      const res = await fetch(`/api/posts/${post.id}/approve`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed");
      toast.success("Approved", {
        description: payload.scheduled_for
          ? `Scheduled for ${formatSlot(payload.scheduled_for)}`
          : "",
      });
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  // Retry a failed publish — same Publer flow, fresh scheduled_for slot.
  async function retry() {
    setPending("retry");
    try {
      const res = await fetch(`/api/posts/${post.id}/approve`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Retry failed");
      toast.success("Retry succeeded", {
        description: payload.scheduled_for
          ? `Scheduled for ${formatSlot(payload.scheduled_for)}`
          : "",
      });
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setPending(null);
    }
  }

  async function reject() {
    if (!feedback.trim()) {
      toast.error("Feedback required for rejection.");
      return;
    }
    setPending("reject");
    try {
      const res = await fetch(`/api/posts/${post.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? "Failed");
      if (payload.reason === "max_regenerations_reached") {
        toast.warning("Max regenerations reached — flagged for manual review.");
      } else {
        toast.success("Rejected. Regenerating with your feedback…");
      }
      setMode("idle");
      setFeedback("");
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  // Quality indicators
  const origScore = post.originality_score ?? null;
  const origPercent = origScore ?? 0;
  const origTone =
    origScore == null
      ? "neu"
      : origScore >= 75
        ? "ok"
        : origScore >= 60
          ? "warn"
          : "err";
  const compliance = post.compliance_status;
  const complianceTone =
    compliance === "pass" ? "ok" : compliance === "flag" ? "warn" : compliance === "block" ? "err" : "neu";
  const plagFlags = Array.isArray(post.plagiarism_flags) ? post.plagiarism_flags : [];

  return (
    <article className="review">
      {/* Preview */}
      {isCarousel && nSlides > 0 ? (
        <div className="carousel-preview">
          <div
            className="carousel-main"
            onClick={() => setPreviewOpen(true)}
            style={{ cursor: "zoom-in" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") setPreviewOpen(true); }}
            aria-label="Open post preview"
          >
            {slides[slideIdx] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slides[slideIdx]} alt={`Slide ${slideIdx + 1}`} />
            )}
            {nSlides > 1 && (
              <>
                <button
                  type="button"
                  className="carousel-prev"
                  onClick={(e) => { e.stopPropagation(); setSlideIdx((i) => (i - 1 + nSlides) % nSlides); }}
                  aria-label="Previous slide"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="carousel-next"
                  onClick={(e) => { e.stopPropagation(); setSlideIdx((i) => (i + 1) % nSlides); }}
                  aria-label="Next slide"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="carousel-dots-row">
            <div className="dotline">
              {slides.map((_, i) => (
                <i
                  key={i}
                  className={i === slideIdx ? "on" : ""}
                  onClick={() => setSlideIdx(i)}
                />
              ))}
            </div>
            <div className="carousel-count">
              {slideIdx + 1} / {nSlides}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`preview ${post.stat_value ? "stat" : ""}`}
          onClick={() => setPreviewOpen(true)}
          style={{ cursor: "zoom-in" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") setPreviewOpen(true); }}
          aria-label="Open post preview"
        >
          {post.image_url ? (
            <Image src={post.image_url} alt="Post" fill unoptimized style={{ objectFit: "cover" }} />
          ) : post.stat_value ? (
            <div>
              <div className="sn">{post.stat_value}</div>
              <div className="ss">
                {(post.caption ?? "").split("\n")[0].slice(0, 80)}
              </div>
            </div>
          ) : (
            <div className="ss">
              {(post.caption ?? "").split("\n")[0].slice(0, 80)}
            </div>
          )}
          {post.stat_source && <div className="src">{post.stat_source}</div>}
        </div>
      )}

      {/* Body */}
      <div className="body-col">
        <div className="tags">
          <span className="chip">{CATEGORY_LABEL[post.category] ?? post.category}</span>
          <span className="chip neu">{isCarousel ? "Carousel · 1080×1350 PDF" : "Image · 1200×1200"}</span>
          <span className="chip date">{formatSlot(post.scheduled_for)}</span>
          {post.rejection_count > 0 && (
            <span className="chip warn">Regen ×{post.rejection_count}</span>
          )}
          {post.status === "failed" && (
            <span className="chip" style={{ background: "#FDECEC", color: "#7A2A24", fontWeight: 600 }}>
              Failed · retry available
            </span>
          )}
        </div>

        {post.caption.split("\n").map((line, i) => {
          if (!line.trim()) return null;
          const isHashtag = line.trim().startsWith("#");
          const isLink = line.includes("http") || line.toLowerCase().includes("book a demo") || line.toLowerCase().includes("download");
          return (
            <p
              key={i}
              className={`cap ${isHashtag ? "hash" : isLink ? "cta" : ""}`}
            >
              {line}
            </p>
          );
        })}

        <div className="quality">
          <div className={`qi ${origTone}`} title="Originality score">
            <span className="ring" style={{ ["--p" as string]: origPercent }}>
              <span>{origScore ?? "—"}</span>
            </span>
            Originality {origScore ?? "—"}
            {origScore != null ? "%" : ""}
          </div>
          <div className={`qi ${complianceTone}`}>
            {compliance === "pass" ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Compliance pass
              </>
            ) : compliance === "flag" ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                </svg>
                Compliance flag
              </>
            ) : compliance === "block" ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Compliance block
              </>
            ) : (
              "Compliance pending"
            )}
          </div>
          {post.stat_value && (
            <div className={`qi ${post.stat_verified ? "ok" : "warn"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {post.stat_verified ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                  </>
                )}
              </svg>
              {post.stat_verified ? "Source verified" : "Source unverified"}
            </div>
          )}
          <div className={`qi ${plagFlags.length > 0 ? "warn" : "ok"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {plagFlags.length === 0 ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              )}
            </svg>
            Plagiarism {plagFlags.length}
          </div>
        </div>

        {post.rejection_feedback && (
          <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: "var(--warning-bg)", border: "1px solid #F5E4B8", fontSize: 12.5, color: "#7A4B12", lineHeight: 1.5 }}>
            <strong>Reviewer feedback:</strong> {post.rejection_feedback}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="actions">
        {post.status === "failed" ? (
          // Failed publish — surface retry + delete. The original Publer
          // error landed in Slack + the post's audit_log; we don't render
          // it inline here, but reviewer can click into the post detail.
          <>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--warning-bg, #FDECEC)",
                border: "1px solid #F5C8C8",
                fontSize: 12.5,
                color: "#7A2A24",
                lineHeight: 1.5,
                width: "100%",
              }}
            >
              <strong>Publish failed.</strong> Check Slack <code style={{ fontSize: 11 }}>#social-media-agent</code> for the Publer error. Click Retry to re-attempt with a fresh schedule slot.
            </div>
            <button
              type="button"
              className="btn act-approve"
              onClick={retry}
              disabled={pending !== null}
              title="Retry publishing this post via Publer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {pending === "retry" ? "Retrying…" : "Retry"}
            </button>
            <button
              type="button"
              onClick={deletePost}
              disabled={pending !== null}
              title="Delete post"
              aria-label="Delete post"
              style={{
                alignSelf: "center",
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text-dim)",
                padding: 6,
                borderRadius: 8,
                cursor: pending !== null ? "not-allowed" : "pointer",
                opacity: pending === "delete" ? 0.5 : 1,
                transition: "color 150ms, border-color 150ms, background 150ms",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (pending !== null) return;
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </>
        ) : mode === "rejecting" ? (
          <>
            <textarea
              autoFocus
              className="mod-textarea"
              placeholder="What should be different?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              disabled={pending === "reject"}
              style={{ fontSize: 12.5 }}
            />
            <button
              type="button"
              className="btn"
              style={{ background: "#B54A44", color: "#fff", borderColor: "#B54A44" }}
              onClick={reject}
              disabled={pending === "reject" || !feedback.trim()}
            >
              {pending === "reject" ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMode("idle");
                setFeedback("");
              }}
              disabled={pending === "reject"}
            >
              Cancel
            </button>
            {/* Delete instead — secondary, subtle. Reason from textarea
                gets carried into the audit log if any. */}
            <button
              type="button"
              onClick={deletePost}
              disabled={pending !== null}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                letterSpacing: ".04em",
                padding: "4px 0",
                cursor: "pointer",
                textAlign: "left",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#B54A44"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              {pending === "delete" ? "Deleting…" : "Delete instead (no regenerate)"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn act-approve"
              onClick={approve}
              disabled={pending !== null}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              className="btn act-reject"
              onClick={() => setMode("rejecting")}
              disabled={pending !== null}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reject
            </button>
            {post.rejection_count > 0 && (
              <div className="regen-badge">
                {post.rejection_count} of 3 regens used
              </div>
            )}
            {/* Trash icon — direct delete with confirm dialog. Subtle so it
                doesn't compete with Approve / Reject as primary actions. */}
            <button
              type="button"
              onClick={deletePost}
              disabled={pending !== null}
              title="Delete post"
              aria-label="Delete post"
              style={{
                alignSelf: "center",
                background: "transparent",
                border: "1px solid transparent",
                color: "var(--text-dim)",
                padding: 6,
                borderRadius: 8,
                cursor: pending !== null ? "not-allowed" : "pointer",
                opacity: pending === "delete" ? 0.5 : 1,
                transition: "color 150ms, border-color 150ms, background 150ms",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (pending !== null) return;
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </>
        )}
      </div>
      {previewOpen && (
        <PostPreviewModal postId={post.id} onClose={() => setPreviewOpen(false)} />
      )}
    </article>
  );
}
