"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import type { PostListRow } from "@/lib/posts-helpers";

interface PostPreviewModalProps {
  postId: string;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORY_LABEL: Record<string, string> = {
  stat_post: "Stat post",
  thought_leadership: "Thought leadership",
  missing_middle: "Missing middle",
  lead_magnet: "Lead magnet",
  perfectpatient: "PerfectPatient",
};

const STATUS_LABEL: Record<string, { text: string; tone: "ok" | "warn" | "info" | "neu" | "err" }> = {
  pending_review: { text: "Pending review", tone: "warn" },
  approved: { text: "Approved", tone: "info" },
  scheduled: { text: "Scheduled", tone: "info" },
  published: { text: "Published", tone: "ok" },
  rejected: { text: "Rejected", tone: "warn" },
  failed: { text: "Failed", tone: "err" },
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

export default function PostPreviewModal({ postId, onClose }: PostPreviewModalProps) {
  const { data, isLoading } = useSWR<{ post: PostListRow }>(
    `/api/posts/${postId}`,
    fetcher
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
      if (e.key === "ArrowRight") setSlideIdx((i) => i + 1);
      if (e.key === "ArrowLeft") setSlideIdx((i) => Math.max(0, i - 1));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, lightbox]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const post = data?.post;
  const isCarousel = post?.format === "carousel";
  const slides = post?.carousel_slide_previews ?? [];
  const currentSlide = isCarousel && slides.length > 0
    ? slides[Math.min(slideIdx, slides.length - 1)]
    : post?.image_url ?? null;
  const status = post?.status ? STATUS_LABEL[post.status] : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(21, 55, 87, 0.55)",
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
          maxWidth: 920,
          maxHeight: "90vh",
          background: "var(--surface)",
          borderRadius: 24,
          boxShadow: "0 30px 60px rgba(11, 45, 72, 0.32)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              marginBottom: 4,
            }}>
              Post preview · {postId.slice(0, 8)}
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--navy)",
              margin: 0,
              letterSpacing: "-.01em",
            }}>
              {post ? CATEGORY_LABEL[post.category] ?? post.category : "Loading…"}
              {status && (
                <span className={`status ${status.tone}`} style={{ marginLeft: 12, verticalAlign: "middle", fontSize: 10 }}>
                  {status.text}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 40,
              height: 40,
              border: "1px solid var(--border)",
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) 1fr",
          gap: 0,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}>
          {/* Left: image/carousel */}
          <div style={{
            background: "var(--surface-hover)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderRight: "1px solid var(--border)",
          }}>
            {isLoading || !post ? (
              <div style={{ aspectRatio: "1/1", borderRadius: 14, background: "var(--border)" }} />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => currentSlide && setLightbox(currentSlide)}
                  disabled={!currentSlide}
                  style={{
                    aspectRatio: isCarousel ? "1080/1350" : "1/1",
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    padding: 0,
                    cursor: currentSlide ? "zoom-in" : "default",
                    position: "relative",
                  }}
                  aria-label="Click to expand"
                >
                  {currentSlide ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentSlide} alt="Post preview" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--text-dim)", fontSize: 13 }}>
                      No preview
                    </div>
                  )}
                  {currentSlide && (
                    <div style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      background: "rgba(11, 45, 72, 0.85)",
                      color: "#fff",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: ".08em",
                    }}>
                      Click to expand
                    </div>
                  )}
                </button>

                {isCarousel && slides.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
                      className="btn"
                      style={{ padding: "6px 10px" }}
                    >
                      ‹
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlideIdx(i)}
                          aria-label={`Slide ${i + 1}`}
                          style={{
                            width: i === slideIdx % slides.length ? 18 : 8,
                            height: 8,
                            borderRadius: 999,
                            background: i === slideIdx % slides.length ? "var(--teal-dark)" : "var(--border-strong)",
                            border: "none",
                            cursor: "pointer",
                            transition: "all var(--t-fast)",
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
                      className="btn"
                      style={{ padding: "6px 10px" }}
                    >
                      ›
                    </button>
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", textAlign: "center", letterSpacing: ".04em" }}>
                  {isCarousel ? `Slide ${(slideIdx % Math.max(1, slides.length)) + 1} / ${slides.length} · 1080×1350` : "Image · 1200×1200"}
                </div>
              </>
            )}
          </div>

          {/* Right: caption + meta */}
          <div style={{ padding: 28, overflow: "auto" }}>
            {isLoading || !post ? (
              <div style={{ color: "var(--text-muted)" }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  <span className="chip neu">{isCarousel ? `Carousel · ${slides.length} slides` : "Image"}</span>
                  <span className="chip date">{formatSlot(post.scheduled_for)}</span>
                  {post.compliance_status === "pass" && (
                    <span className="chip" style={{ background: "var(--success-bg)", color: "var(--success)" }}>Compliance pass</span>
                  )}
                  {post.originality_score != null && (
                    <span className="chip neu">Originality {post.originality_score}</span>
                  )}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div className="mini" style={{ margin: "0 0 8px" }}>Caption</div>
                  <p className="cap" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{post.caption}</p>
                </div>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="mini" style={{ margin: "0 0 8px" }}>Hashtags</div>
                    <p className="cap hash" style={{ margin: 0 }}>{post.hashtags.join(" ")}</p>
                  </div>
                )}

                {post.stat_value && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="mini" style={{ margin: "0 0 8px" }}>Source stat</div>
                    <p className="cap" style={{ margin: 0, fontSize: 13.5 }}>
                      <strong style={{ color: "var(--navy)" }}>{post.stat_value}</strong>
                      {post.stat_source && <><br /><span style={{ color: "var(--text-muted)" }}>{post.stat_source}</span></>}
                    </p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, padding: "16px 0", borderTop: "1px solid var(--border)" }}>
                  {post.published_url && (
                    <div>
                      <div className="mini" style={{ margin: "0 0 4px" }}>Published</div>
                      <a href={post.published_url} target="_blank" rel="noreferrer" style={{ color: "var(--teal-dark)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                        View on LinkedIn →
                      </a>
                    </div>
                  )}
                  {post.publer_post_id && (
                    <div>
                      <div className="mini" style={{ margin: "0 0 4px" }}>Publer ID</div>
                      <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{post.publer_post_id}</code>
                    </div>
                  )}
                  {post.utm_campaign && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div className="mini" style={{ margin: "0 0 4px" }}>UTM campaign</div>
                      <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{post.utm_campaign}</code>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
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
              boxShadow: "0 30px 60px rgba(0, 0, 0, 0.5)",
              borderRadius: 12,
            }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
