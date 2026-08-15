"use client";

import type { ScoringBreakdown } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-primary",
  "bg-[hsl(173_58%_39%)]",
  "bg-[hsl(265_60%_58%)]",
  "bg-[hsl(38_84%_55%)]",
];

export function ScoringBreakdownView({ scoring }: { scoring: ScoringBreakdown }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Scoring Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Deterministic weighted model ·{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {scoring.total_score.toFixed(3)}
          </span>{" "}
          total ·{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {(scoring.normalized_confidence * 100).toFixed(1)}%
          </span>{" "}
          normalised confidence
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {scoring.dimensions.map((dim, idx) => {
          const pct = Math.round(dim.raw_score * 100);
          const barColor = BAR_COLORS[idx % BAR_COLORS.length];

          return (
            <div key={dim.dimension}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-foreground">{dim.dimension}</p>
                <div className="flex shrink-0 items-baseline gap-2 text-[0.8125rem] tabular-nums">
                  <span className="font-semibold text-foreground">{pct}%</span>
                  <span className="text-muted-foreground/70">
                    w={dim.weight} · {dim.evidence_count} item{dim.evidence_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 ease-out", barColor)}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={dim.dimension}
                />
              </div>

              <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted-foreground">
                {dim.description}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
