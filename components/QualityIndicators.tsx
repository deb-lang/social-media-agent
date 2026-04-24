import type { ComplianceStatus, PostListRow } from "@/lib/posts-helpers";

function Pill({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "fail";
  title?: string;
}) {
  const map = {
    neutral: "bg-[#F6F7F9] text-[#536A82] border-[#E8ECEF]",
    success: "bg-[#E8F7EF] text-[#1B7A3E] border-[#C4E5D0]",
    warn: "bg-[#FFF4DB] text-[#9C6C00] border-[#F3E0A5]",
    fail: "bg-[#FDECEC] text-[#B91C1C] border-[#F5C8C8]",
  }[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${map}`}
    >
      {children}
    </span>
  );
}

export default function QualityIndicators({ post }: { post: PostListRow }) {
  const items: React.ReactNode[] = [];

  // Originality score
  if (post.originality_score != null) {
    const tone =
      post.originality_score >= 75 ? "success" : post.originality_score >= 60 ? "warn" : "fail";
    items.push(
      <Pill key="orig" tone={tone} title="Claude self-review score for human-likeness">
        ⚡ Originality {post.originality_score}
      </Pill>
    );
  }

  // Compliance
  const c = post.compliance_status as ComplianceStatus;
  if (c && c !== "pending") {
    const tone = c === "pass" ? "success" : c === "flag" ? "warn" : "fail";
    const label = c === "pass" ? "✓ Compliance" : c === "flag" ? "⚠ Compliance" : "✗ Compliance";
    const issues = post.compliance_issues as Array<{ rule?: string }> | null;
    const title = issues?.length
      ? issues.map((i) => i?.rule).filter(Boolean).join("; ")
      : undefined;
    items.push(
      <Pill key="compl" tone={tone} title={title}>
        {label}
      </Pill>
    );
  }

  // Plagiarism
  const pf = post.plagiarism_flags as Array<{ sentence?: string }> | null;
  if (pf && pf.length > 0) {
    items.push(
      <Pill key="plag" tone="fail" title={pf.map((p) => p?.sentence).filter(Boolean).join(" · ")}>
        ⚠ Plagiarism {pf.length}
      </Pill>
    );
  }

  // Stat verification
  if (post.stat_value) {
    items.push(
      <Pill
        key="stat"
        tone={post.stat_verified ? "success" : "warn"}
        title={post.stat_source ?? undefined}
      >
        {post.stat_verified ? "✓ Source" : "⚠ Source not verified"}
      </Pill>
    );
  }

  // Recycled
  if (post.is_recycled) {
    items.push(
      <Pill key="rec" tone="neutral">
        ♻ Recycled
      </Pill>
    );
  }

  if (items.length === 0) return null;

  return <div className="flex flex-wrap gap-1.5">{items}</div>;
}
