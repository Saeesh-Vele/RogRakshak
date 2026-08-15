"use client";

import type { ScoringBreakdown } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Factors get distinct hues so a bar can be told apart from its neighbours at a
 * glance. Assigned by position, not by dimension name — the backend owns the
 * dimension list, and a rename must not silently drop a factor back to grey.
 */
const FACTOR_COLORS = [
  "bg-primary",
  "bg-node-location",
  "bg-node-staff",
  "bg-node-downstream",
  "bg-node-patient",
  "bg-node-neutral",
] as const;

export function ScoringBreakdownView({
  scoring,
}: {
  scoring: ScoringBreakdown;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-1 border-b border-border bg-muted/40 pb-4">
        <CardTitle>Scoring Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Deterministic weighted score ·{" "}
          <span className="font-medium text-foreground tabular-nums">
            {scoring.total_score.toFixed(3)}
          </span>{" "}
          total ·{" "}
          <span className="font-medium text-foreground tabular-nums">
            {(scoring.normalized_confidence * 100).toFixed(1)}%
          </span>{" "}
          normalised confidence
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {scoring.dimensions.map((dim, i) => {
          const pct = Math.round(dim.raw_score * 100);
          const color = FACTOR_COLORS[i % FACTOR_COLORS.length];

          return (
            <div
              key={dim.dimension}
              className="rounded-lg border border-border p-3.5 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 font-semibold leading-tight text-foreground">
                  {dim.dimension}
                </p>
                <p className="shrink-0 text-[1.0625rem] font-bold tabular-nums leading-none text-foreground">
                  {pct}
                  <span className="text-[0.75rem] font-semibold text-muted-foreground">
                    %
                  </span>
                </p>
              </div>

              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={dim.dimension}
                  />
                </div>
                <p className="shrink-0 text-[0.75rem] tabular-nums text-muted-foreground">
                  {dim.weighted_score.toFixed(3)}
                  <span className="text-muted-foreground/70">
                    {" "}
                    · w={dim.weight} · {dim.evidence_count} item
                    {dim.evidence_count !== 1 ? "s" : ""}
                  </span>
                </p>
              </div>

              <p className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">
                {dim.description}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
