"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { PostListRow } from "@/lib/posts-helpers";

interface PostPreviewModalProps {
  postId: string;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORY_LABEL: Record<string, string> = {
  stat_post: "Stat",
  thought_leadership: "Thought leadership",
  missing_middle: "Missing middle",
  lead_magnet: "Lead magnet",
  perfectpatient: "PerfectPatient",
};

interface StatusMeta {
  eyebrow: string;
  pillLabel: string;
  pillTone: "ok" | "warn" | "info" | "neu" | "err";
  ctaLabel: string;
  ctaHref: string | null;
}

function statusMeta(post: PostListRow): StatusMeta {
  switch (post.status) {
    case "pending_review":
      return {
        eyebrow: "Pending approval · queue",
        pillLabel: "Pending review",
        pillTone: "warn",
        ctaLabel: "Go to approval queue",
        ctaHref: "/queue",
      };
    case "approved":
    case "scheduled":
      return {
        eyebrow: "Scheduled · calendar",
        pillLabel: "Scheduled",
        pillTone: "info",
        ctaLabel: "View in calendar",
        ctaHref: "/calendar",
      };
    case "published":
      return {
        eyebrow: "Published · history",
        pillLabel: "Published",
        pillTone: "ok",
        ctaLabel: post.published_url ? "View on LinkedIn ↗" : "View in history",
        ctaHref: post.published_url ?? "/history",
      };
    case "rejected":
      return {
        eyebrow: "Rejected · queue",
        pillLabel: "Rejected",
        pillTone: "warn",
        ctaLabel: "Back to queue",
        ctaHref: "/queue",
      };
    case "failed":
      return {
        eyebrow: "Failed · history",
        pillLabel: "Failed",
        pillTone: "err",
        ctaLabel: "View in history",
        ctaHref: "/history",
      };
    default:
      return {
        eyebrow: "Post preview",
        pillLabel: post.status.replace(/_/g, " "),
        pillTone: "neu",
        ctaLabel: "View in queue",
        ctaHref: "/queue",
      };
  }
}

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

function formatLabel(format: string): string {
  return format === "carousel" ? "Carousel" : "Image";
}

function shortPostId(id: string): string {
  return `p-${id.slice(0, 4)}`;
}

function firstLineOf(caption: string, max = 90): string {
  const line = caption.split("\n").map((s) => s.trim()).find(Boolean) ?? caption;
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

export default function PostPreviewModal({ postId, onClose }: PostPreviewModalProps) {
  const router = useRouter();
  const { data, isLoading } = useSWR<{ post: PostListRow }>(
    `/api/posts/${postId}`,
    fetcher
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const post = data?.post;
  const isCarousel = post?.format === "carousel";
  const slides = post?.carousel_slide_previews ?? [];
  const currentSlide = isCarousel && slides.length > 0
    ? slides[slideIdx % slides.length]
    : post?.image_url ?? null;

  // Esc + arrow keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
      if (isCarousel && slides.length > 1) {
        if (e.key === "ArrowRight") setSlideIdx((i) => (i + 1) % slides.length);
        if (e.key === "ArrowLeft") setSlideIdx((i) => (i - 1 + slides.length) % slides.length);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, lightbox, isCarousel, slides.length]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const meta = post ? statusMeta(post) : null;
  const headline = post ? firstLineOf(post.caption) : "Loading…";
  const categoryShort = post ? CATEGORY_LABEL[post.category] ?? post.category : "";
  const subtitle = post ? `${categoryShort} · ${formatLabel(post.format)}` : "";

  function handleCta() {
    if (!meta?.ctaHref) return;
    if (meta.ctaHref.startsWith("http")) {
      window.open(meta.ctaHref, "_blank", "noopener,noreferrer");
    } else {
      router.push(meta.ctaHref);
      onClose();
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(21, 55, 87, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          maxWidth: 1080,
          maxHeight: "92vh",
          background: "var(--surface)",
          borderRadius: 28,
          boxShadow: "0 30px 80px rgba(11, 45, 72, 0.32)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Close button — absolute top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          style={{
            position: "absolute",
            top: 22,
            right: 22,
            width: 42,
            height: 42,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
            transition: "all var(--t-fast)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header — eyebrow + big title + subtitle */}
        <div style={{ padding: "40px 56px 28px", maxWidth: "calc(100% - 80px)" }}>
          {meta && (
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              marginBottom: 14,
            }}>
              {meta.eyebrow}
            </div>
          )}
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.15,
            letterSpacing: "-.02em",
            color: "var(--navy)",
            margin: 0,
          }}>
            {isLoading ? "Loading…" : headline}
          </h1>
          {post && (
            <div style={{
              marginTop: 10,
              fontSize: 15,
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Body — 2 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 0,
          flex: 1,
          minHeight: 0,
          padding: "0 56px 32px",
        }}>
          {/* Left — image preview */}
          <div style={{ paddingRight: 32 }}>
            {isLoading || !post ? (
              <div style={{ aspectRatio: "1/1", borderRadius: 18, background: "var(--border)" }} />
            ) : currentSlide ? (
              <button
                type="button"
                onClick={() => setLightbox(currentSlide)}
                style={{
                  width: "100%",
                  aspectRatio: isCarousel ? "1080/1350" : "1/1",
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "none",
                  padding: 0,
                  background: "var(--bg)",
                  cursor: "zoom-in",
                  position: "relative",
                  display: "block",
                }}
                aria-label="Click to expand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSlide}
                  alt="Post preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {isCarousel && slides.length > 1 && (
                  <div style={{
                    position: "absolute",
                    bottom: 14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 5,
                    background: "rgba(11, 45, 72, 0.7)",
                    backdropFilter: "blur(6px)",
                    padding: "6px 10px",
                    borderRadius: 999,
                  }}>
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        style={{
                          width: i === slideIdx % slides.length ? 16 : 6,
                          height: 6,
                          borderRadius: 999,
                          background: i === slideIdx % slides.length ? "#fff" : "rgba(255, 255, 255, 0.45)",
                          transition: "all var(--t-fast)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            ) : (
              <div style={{
                aspectRatio: "1/1",
                borderRadius: 18,
                background: "var(--surface-hover)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}>
                No preview
              </div>
            )}

            {/* Carousel nav (under preview) */}
            {isCarousel && slides.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
                  className="btn"
                  style={{ padding: "8px 12px" }}
                  aria-label="Previous slide"
                >
                  ‹
                </button>
                <div style={{ alignSelf: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: ".06em" }}>
                  Slide {(slideIdx % slides.length) + 1} / {slides.length}
                </div>
                <button
                  type="button"
                  onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
                  className="btn"
                  style={{ padding: "8px 12px" }}
                  aria-label="Next slide"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {/* Right — status pill + headline + meta */}
          <div style={{ paddingLeft: 4, display: "flex", flexDirection: "column", gap: 18 }}>
            {meta && (
              <div>
                <span className={`status ${meta.pillTone}`} style={{ fontSize: 11, padding: "6px 12px" }}>
                  {meta.pillLabel}
                </span>
              </div>
            )}

            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              lineHeight: 1.3,
              letterSpacing: "-.01em",
              color: "var(--navy)",
            }}>
              {headline}
            </div>

            <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: 0 }} />

            <dl style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              rowGap: 16,
              columnGap: 12,
              margin: 0,
              alignItems: "baseline",
            }}>
              <dt style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}>
                Slot
              </dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", fontWeight: 600 }}>
                {post ? formatSlot(post.scheduled_for) : "—"}
              </dd>

              <dt style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}>
                Format
              </dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", fontWeight: 600 }}>
                {post ? formatLabel(post.format) : "—"}
              </dd>

              <dt style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}>
                Category
              </dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", fontWeight: 600 }}>
                {categoryShort || "—"}
              </dd>

              <dt style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}>
                Post ID
              </dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", letterSpacing: ".04em" }}>
                {post ? shortPostId(post.id) : "—"}
              </dd>

              {post?.originality_score != null && (
                <>
                  <dt style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                  }}>
                    Originality
                  </dt>
                  <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", fontWeight: 600 }}>
                    {post.originality_score} / 100
                  </dd>
                </>
              )}

              {post?.compliance_status && post.compliance_status !== "pending" && (
                <>
                  <dt style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                  }}>
                    Compliance
                  </dt>
                  <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, color: "var(--navy)", fontWeight: 600, textTransform: "capitalize" }}>
                    {post.compliance_status}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 56px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}>
          <button type="button" onClick={onClose} className="btn">
            Close
          </button>
          {meta?.ctaHref && (
            <button type="button" onClick={handleCta} className="btn primary">
              {meta.ctaLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox over the modal */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Expanded preview"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              boxShadow: "0 40px 80px rgba(0, 0, 0, 0.5)",
              borderRadius: 14,
            }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close lightbox"
            style={{
              position: "absolute",
              top: 28,
              right: 28,
              width: 48,
              height: 48,
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
