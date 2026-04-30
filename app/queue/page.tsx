"use client";

import useSWR from "swr";
import PostCard from "@/components/PostCard";
import type { PostListRow } from "@/lib/posts-helpers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QueuePage() {
  const {
    data: pendingData,
    isLoading: pendingLoading,
    mutate: mutatePending,
  } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=pending_review",
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true }
  );
  // Failed posts: keep them visible in the dashboard so reviewer can hit
  // Retry instead of having them silently disappear after a Publer error.
  const { data: failedData, mutate: mutateFailed } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=failed",
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const pendingPosts = pendingData?.posts ?? [];
  const failedPosts = failedData?.posts ?? [];

  // Single onChange refetches both lists — a retry can flip a row from
  // failed → scheduled, which would otherwise leave a stale entry.
  const refetchAll = () => {
    mutatePending();
    mutateFailed();
  };

  return (
    <section className="section container" id="review">
      <span className="tag-eyebrow">Approval queue · / queue</span>
      <div className="mini">Human-in-the-loop</div>
      <h2 className="page-title">Posts awaiting review</h2>
      <p className="page-sub">
        Review the rendered image or carousel. Approve to schedule, reject with
        feedback to regenerate (max 3 tries). Failed publishes stay here with a
        Retry button — they aren&apos;t auto-removed.
      </p>

      {/* Failed posts — surface first so they don't get buried */}
      {failedPosts.length > 0 && (
        <>
          <div
            className="mini"
            style={{ marginTop: 22, marginBottom: 8, color: "#7A2A24" }}
          >
            Failed publishes · needs retry ({failedPosts.length})
          </div>
          <div className="review-list">
            {failedPosts.map((post) => (
              <PostCard key={post.id} post={post} onChange={refetchAll} />
            ))}
          </div>
        </>
      )}

      {/* Pending review */}
      {failedPosts.length > 0 && pendingPosts.length > 0 && (
        <div className="mini" style={{ marginTop: 32, marginBottom: 8 }}>
          Pending review ({pendingPosts.length})
        </div>
      )}
      {pendingLoading && pendingPosts.length === 0 ? (
        <div className="card" style={{ marginTop: 22, textAlign: "center" }}>
          Loading queue…
        </div>
      ) : pendingPosts.length === 0 && failedPosts.length === 0 ? (
        <div
          className="card"
          style={{ marginTop: 22, textAlign: "center", padding: "48px 28px" }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            No posts awaiting review.
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>
            Click Generate Batch in the top bar to create new posts.
          </p>
        </div>
      ) : pendingPosts.length === 0 ? null : (
        <div className="review-list">
          {pendingPosts.map((post) => (
            <PostCard key={post.id} post={post} onChange={refetchAll} />
          ))}
        </div>
      )}
    </section>
  );
}
