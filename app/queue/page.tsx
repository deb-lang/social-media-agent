"use client";

import useSWR from "swr";
import PostCard from "@/components/PostCard";
import type { PostListRow } from "@/lib/posts-helpers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QueuePage() {
  const { data, isLoading, mutate } = useSWR<{ posts: PostListRow[] }>(
    "/api/posts?status=pending_review",
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true }
  );

  const posts = data?.posts ?? [];

  return (
    <section className="section container" id="review">
      <span className="tag-eyebrow">Approval queue · / queue</span>
      <div className="mini">Human-in-the-loop</div>
      <h2 className="page-title">Posts awaiting review</h2>
      <p className="page-sub">
        Review the rendered image or carousel. Approve to schedule, reject with
        feedback to regenerate (max 3 tries).
      </p>

      {isLoading && posts.length === 0 ? (
        <div className="card" style={{ marginTop: 22, textAlign: "center" }}>
          Loading queue…
        </div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ marginTop: 22, textAlign: "center", padding: "48px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
            No posts awaiting review.
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>
            Click Generate Batch in the top bar to create new posts.
          </p>
        </div>
      ) : (
        <div className="review-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={() => mutate()} />
          ))}
        </div>
      )}
    </section>
  );
}
