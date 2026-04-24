import type { PostStatus } from "@/lib/posts-helpers";

const STYLES: Record<PostStatus, { bg: string; text: string; label: string }> = {
  pending_review: { bg: "bg-[#FFF4DB]", text: "text-[#9C6C00]", label: "Pending" },
  approved: { bg: "bg-[#E8F0FE]", text: "text-[#1967D2]", label: "Approved" },
  rejected: { bg: "bg-[#FFE8DB]", text: "text-[#B3541E]", label: "Rejected" },
  scheduled: { bg: "bg-[#EDEAFD]", text: "text-[#4F46E5]", label: "Scheduled" },
  published: { bg: "bg-[#E8F7EF]", text: "text-[#1B7A3E]", label: "Published" },
  failed: { bg: "bg-[#FDECEC]", text: "text-[#B91C1C]", label: "Failed" },
};

export default function StatusBadge({ status }: { status: PostStatus }) {
  const s = STYLES[status] ?? STYLES.pending_review;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
