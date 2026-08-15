"use client";

import type { ScoringBreakdown } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ScoringBreakdownView({
  scoring,
}: {
  scoring: ScoringBreakdown;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
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
      <CardContent className="space-y-5">
        {scoring.dimensions.map((dim) => (
          <div key={dim.dimension}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-foreground">{dim.dimension}</p>
              <p className="shrink-0 text-[0.8125rem] text-muted-foreground tabular-nums">
                {dim.weighted_score.toFixed(3)}
                <span className="text-muted-foreground/70">
                  {" "}
                  · w={dim.weight} · {dim.evidence_count} item
                  {dim.evidence_count !== 1 ? "s" : ""}
                </span>
              </p>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.round(dim.raw_score * 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(dim.raw_score * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={dim.dimension}
              />
            </div>

            <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted-foreground">
              {dim.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
