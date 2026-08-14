"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Clock, Info } from "lucide-react";
import { InvestigationTimelineSpan } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Dynamic import for Plotly to prevent SSR window reference error
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center text-xs text-slate-400">
      Loading interactive Gantt timeline...
    </div>
  ),
});

interface PatientTimelineProps {
  spans: InvestigationTimelineSpan[];
}

const categoryColorMap: Record<string, string> = {
  ICU: "#e11d48", // rose-600
  Ward: "#0284c7", // sky-600
  Bed: "#0d9488", // teal-600
  Procedure: "#d97706", // amber-600
  Shift: "#4f46e5", // indigo-600 (Staff shift)
  Isolation: "#9333ea", // purple-600
  Transfer: "#64748b", // slate-500
};

export function PatientTimeline({ spans }: PatientTimelineProps) {
  const plotData = useMemo(() => {
    if (!spans || spans.length === 0) return null;

    const traces = spans.map((span) => {
      const color = categoryColorMap[span.category] || "#0f766e";
      const startTime = new Date(span.start).getTime();
      const endTime = new Date(span.end).getTime();
      const durationMs = Math.max(endTime - startTime, 3600000); // minimum 1h width

      return {
        type: "bar" as const,
        orientation: "h" as const,
        x: [durationMs],
        base: [span.start],
        y: [span.entityName],
        name: span.location,
        text: `${span.category}: ${span.location} (${span.description || ""})`,
        hoverinfo: "text" as const,
        hoverlabel: {
          bgcolor: "#0f172a",
          bordercolor: "#334155",
          font: { color: "#ffffff", size: 12, family: "Inter, sans-serif" },
        },
        marker: {
          color: color,
          opacity: span.overlapWithIndex ? 0.95 : 0.8,
          line: {
            color: span.overlapWithIndex ? "#be123c" : "#ffffff",
            width: span.overlapWithIndex ? 2 : 1,
          },
        },
        showlegend: false,
      };
    });

    return traces;
  }, [spans]);

  if (!spans || spans.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-center text-slate-500 text-xs">
          Reconstructed movement events will appear as the Timeline Agent completes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="size-4 text-teal-600" />
            <span>Temporal Co-Location & Movement Gantt Timeline</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized patient movement, ICU procedures, and staff crossover shift windows
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-rose-600" /> ICU Stay
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-indigo-600" /> Vector Nurse Shift
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-sky-600" /> Gen Med A Ward
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-xs bg-amber-600" /> Procedure
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="w-full overflow-x-auto">
          {plotData && (
            <Plot
              data={plotData}
              layout={{
                barmode: "stack",
                height: 280,
                margin: { l: 180, r: 20, t: 10, b: 35 },
                paper_bgcolor: "#ffffff",
                plot_bgcolor: "#f8fafc",
                xaxis: {
                  type: "date",
                  tickformat: "%b %d\n%H:%M",
                  gridcolor: "#e2e8f0",
                  zerolinecolor: "#cbd5e1",
                  tickfont: { size: 10, color: "#64748b" },
                },
                yaxis: {
                  autorange: "reversed",
                  gridcolor: "#f1f5f9",
                  tickfont: { size: 11, color: "#1e293b", family: "Inter, sans-serif" },
                },
                autosize: true,
              }}
              config={{
                responsive: true,
                displayModeBar: false,
              }}
              style={{ width: "100%", height: "280px" }}
            />
          )}
        </div>

        {/* Temporal narrative breakdown */}
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
          <Info className="size-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Key Temporal Overlap:</strong> Nurse Anita Sharma cared for Index Patient in ICU during{" "}
            <span className="font-mono font-semibold">Aug 03 16:00 → Aug 04 04:00</span>, before rotating to General Medicine A during{" "}
            <span className="font-mono font-semibold">Aug 05 16:00 → Aug 07 04:00</span>. Downstream cases (Suresh Joshi, Meenakshi Rao, Tarun Agarwal) tested positive 48-72h after this shift crossover.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
