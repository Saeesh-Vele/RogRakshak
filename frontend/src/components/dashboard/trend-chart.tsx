"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/metrics";

interface TrendChartProps {
  points: TrendPoint[];
}

function TrendTooltip({
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
      <p className="text-xs font-medium text-muted-foreground">{point.label}</p>
      <p className="text-sm font-bold text-foreground">
        {point.cumulative} confirmed
      </p>
    </div>
  );
}

/**
 * Blue rounded badge with a pointer, anchored above the final data point.
 * Rendered as SVG because recharts labels have no background of their own.
 */
function CalloutBadge(props: {
  text: string;
  /** Only render the badge on this data index (the final point). */
  targetIndex?: number;
  // Injected by recharts <LabelList content={...}>
  x?: number;
  y?: number;
  index?: number;
}) {
  const { text, targetIndex, x: cx, y: cy, index } = props;
  if (cx == null || cy == null) return null;
  if (targetIndex != null && index !== targetIndex) return null;

  const paddingX = 9;
  const charWidth = 6.6;
  const width = text.length * charWidth + paddingX * 2;
  const height = 24;
  const gap = 12;
  const boxX = cx - width / 2;
  const boxY = cy - gap - height;

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={width}
        height={height}
        rx={6}
        fill="hsl(var(--primary))"
      />
      <path
        d={`M ${cx - 4} ${boxY + height} L ${cx} ${boxY + height + 4} L ${cx + 4} ${boxY + height} Z`}
        fill="hsl(var(--primary))"
      />
      <text
        x={cx}
        y={boxY + height / 2 + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="hsl(var(--primary-foreground))"
      >
        {text}
      </text>
    </g>
  );
}

export function TrendChart({ points }: TrendChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
        Not enough dated culture results to plot a trend.
      </div>
    );
  }

  const last = points[points.length - 1];
  const max = Math.max(...points.map((p) => p.cumulative));
  // Give the callout badge vertical room above the final point
  const yMax = Math.max(4, Math.ceil((max + 1) * 1.25));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 30, right: 64, bottom: 4, left: 0 }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeOpacity={0.7}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickMargin={12}
            minTickGap={24}
          />
          <YAxis
            domain={[0, yMax]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={false}
            isAnimationActive={false}
            activeDot={{
              r: 4,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
            }}
          >
            {/* Floating value callout pinned to the final point */}
            <LabelList
              dataKey="cumulative"
              content={
                <CalloutBadge
                  text={`${last.cumulative} confirmed`}
                  targetIndex={points.length - 1}
                />
              }
            />
          </Area>

          {/* End-point marker */}
          <ReferenceDot
            x={last.label}
            y={last.cumulative}
            r={4.5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--card))"
            strokeWidth={2}
            isFront
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
