"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TrendPoint {
  month: string;
  value: number;
}

export function TrendChart({
  data,
  label,
  valueFormatter,
}: {
  data: TrendPoint[];
  label: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#74CCD3" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#74CCD3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECEF" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="#8A9AAD"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#8A9AAD"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          formatter={(v: number) => (valueFormatter ? valueFormatter(v) : v)}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E8ECEF",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#188F8B"
          strokeWidth={2}
          fill={`url(#grad-${label})`}
          name={label}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface CategoryBar {
  category: string;
  value: number;
}

export function CategoryBarChart({
  data,
  valueFormatter,
}: {
  data: CategoryBar[];
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECEF" horizontal={false} />
        <XAxis
          type="number"
          stroke="#8A9AAD"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={valueFormatter}
        />
        <YAxis
          type="category"
          dataKey="category"
          stroke="#153757"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip
          formatter={(v: number) => (valueFormatter ? valueFormatter(v) : v)}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E8ECEF",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="value" fill="#74CCD3" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
