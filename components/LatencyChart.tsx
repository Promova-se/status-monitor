"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export type Point = {
  label: string;
  latency: number | null;
  online: number; // 1 = no ar, 0 = fora
};

export default function LatencyChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Ainda sem histórico. Rode uma checagem para começar.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="rose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D8D" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#FF4D8D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#3A2E42" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#A99FB0", fontSize: 11 }}
            axisLine={{ stroke: "#3A2E42" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#A99FB0", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            unit="ms"
          />
          <Tooltip
            contentStyle={{
              background: "#221A2A",
              border: "1px solid #3A2E42",
              borderRadius: 12,
              color: "#F4E9EF",
              fontSize: 12,
            }}
            labelStyle={{ color: "#A99FB0" }}
            formatter={(v: number) => [`${v} ms`, "Latência"]}
          />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="#FF4D8D"
            strokeWidth={2}
            fill="url(#rose)"
            connectNulls
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
