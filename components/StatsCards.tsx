"use client";

import useSWR from "swr";

interface Summary {
  summary: {
    month: string;
    post_count: number;
    impressions: number;
    engagement_rate_avg: number;
    link_clicks: number;
    follower_delta: number;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function StatsCards() {
  const { data } = useSWR<Summary>("/api/analytics/summary", fetcher, {
    refreshInterval: 60_000,
  });

  const s = data?.summary;
  const items: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "Impressions",
      value: s ? formatNum(s.impressions) : "—",
      sub: "This month",
    },
    {
      label: "Engagement rate",
      value: s ? `${s.engagement_rate_avg}%` : "—",
      sub: "Avg this month",
    },
    {
      label: "Link clicks",
      value: s ? formatNum(s.link_clicks) : "—",
      sub: "This month",
    },
    {
      label: "Follower growth",
      value: s ? (s.follower_delta >= 0 ? `+${formatNum(s.follower_delta)}` : formatNum(s.follower_delta)) : "—",
      sub: "Last 30 days",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white border border-[#E8ECEF] rounded-2xl p-6 hover:border-[#D4DBE1] transition-colors"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A9AAD] mb-2">
            {item.label}
          </p>
          <p className="font-[Manrope,sans-serif] font-bold text-3xl text-[#153757] tracking-tight">
            {item.value}
          </p>
          {item.sub && <p className="text-xs text-[#8A9AAD] mt-1">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
