"use client";

import useSWR from "swr";

interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown> | null;
}

const ACTION_ICON: Record<string, string> = {
  generate: "✨",
  approve: "✓",
  reject: "✗",
  regenerate: "↻",
  schedule_override: "🗓",
  publish: "📣",
  fail: "🚨",
  recycle: "♻",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AuditTrail({ postId }: { postId: string }) {
  const { data, isLoading } = useSWR<{ post: unknown; audit: AuditEntry[] }>(
    `/api/posts/${postId}`,
    fetcher
  );

  if (isLoading) {
    return <div className="text-sm text-[#8A9AAD]">Loading history…</div>;
  }

  const entries = data?.audit ?? [];
  if (entries.length === 0) {
    return <div className="text-sm text-[#8A9AAD]">No activity yet.</div>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <div className="w-7 h-7 shrink-0 rounded-full bg-[#EDF9FC] text-[#188F8B] flex items-center justify-center text-xs font-semibold">
            {ACTION_ICON[e.action] ?? "·"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-[#153757] capitalize">{e.action.replace(/_/g, " ")}</span>
              <span className="text-[11px] text-[#8A9AAD]">
                {new Date(e.created_at).toLocaleString()} · {e.performed_by ?? "system"}
              </span>
            </div>
            {e.details && Object.keys(e.details).length > 0 && (
              <pre className="mt-1 text-[11px] text-[#536A82] whitespace-pre-wrap break-words font-mono bg-[#F6F7F9] rounded p-2 overflow-x-auto">
                {JSON.stringify(e.details, null, 2)}
              </pre>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
