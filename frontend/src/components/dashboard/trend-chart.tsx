"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/metrics";

interface TrendChartProps {
  points: TrendPoint[];
}

/**
 * An epidemic curve: bars for new confirmed positives on each day, with the
 * running total drawn over them.
 *
 * This is the standard chart of the field, and it is also the more honest one
 * for this data — a cumulative area alone can only ever slope up and to the
 * right, so on a handful of cases it reported growth where the underlying
 * picture was three isolates on three separate days. The bars show when
 * anything actually happened; the line keeps the total in view.
 *
 * Both series count patients, so they share one integer axis rather than
 * carrying a second scale that would imply more precision than exists.
 */

function CurveTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-pop">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
        {point.label}
      </p>
      <p className="mt-1 text-[0.8125rem] text-foreground">
        <span className="font-semibold tabular-nums">{point.count}</span> new
        {point.count === 1 ? " positive" : " positives"}
      </p>
      <p className="text-[0.8125rem] text-muted-foreground">
        <span className="font-semibold tabular-nums">{point.cumulative}</span>{" "}
        cumulative
      </p>
    </div>
  );
}

function LegendKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 pb-1">
      <span className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-[2px] bg-node-infected" />
        New positives
      </span>
      <span className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
        <span className="h-[2px] w-4 rounded-full bg-primary" />
        Cumulative
      </span>
    </div>
  );
}

export function TrendChart({ points }: TrendChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-1.5 px-6 text-center">
        <p className="text-sm text-foreground">No curve to plot yet.</p>
        <p className="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          The curve is drawn from recorded culture dates. It appears once at
          least two dated positive results exist.
        </p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.cumulative));
  const yMax = Math.max(4, Math.ceil(max * 1.2));

  return (
    <div>
      <LegendKey />
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
            barCategoryGap="35%"
          >
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeOpacity={0.8}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickMargin={10}
              minTickGap={20}
            />
            <YAxis
              domain={[0, yMax]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              content={<CurveTooltip />}
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.5 }}
            />

            <Bar
              dataKey="count"
              fill="hsl(var(--node-infected))"
              radius={[3, 3, 0, 0]}
              maxBarSize={34}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "hsl(var(--card))",
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
              }}
              activeDot={{ r: 4.5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
