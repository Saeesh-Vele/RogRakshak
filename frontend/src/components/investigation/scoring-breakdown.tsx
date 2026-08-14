"use client";

import type { ScoringBreakdown } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoringBreakdownViewProps {
  scoring: ScoringBreakdown;
}

export function ScoringBreakdownView({ scoring }: ScoringBreakdownViewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Scoring Breakdown</CardTitle>
        <p className="text-xs text-slate-400">
          Total Score: {scoring.total_score.toFixed(3)} · Normalized Confidence:{" "}
          {(scoring.normalized_confidence * 100).toFixed(1)}%
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scoring.dimensions.map((dim) => (
            <div key={dim.dimension} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-200 font-medium truncate mr-2">
                  {dim.dimension}
                </span>
                <span className="text-slate-400 whitespace-nowrap text-xs">
                  {dim.weighted_score.toFixed(3)} ({dim.evidence_count}{" "}
                  evidence)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500/70 transition-all duration-500"
                    style={{ width: `${dim.raw_score * 100}%` }}
                    role="progressbar"
                    aria-valuenow={dim.raw_score * 100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={dim.dimension}
                  />
                </div>
                <span className="text-xs text-slate-500 w-12 text-right">
                  w={dim.weight}
                </span>
              </div>
              <p className="text-xs text-slate-500">{dim.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
