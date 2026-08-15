"use client";

import type { InvestigationTimelineEntry } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/risk";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  admission: "Admission",
  discharge: "Discharge",
  movement: "Movement",
  lab_report: "Lab Report",
  procedure: "Procedure",
};

function eventLabel(entry: InvestigationTimelineEntry): string {
  // Prefer the concrete place when the event has one — matches how the
  // reference design reads ("02 Aug — ICU Bed 12").
  if (entry.location) return entry.location;
  return EVENT_LABELS[entry.event_type] ?? entry.event_type;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TimelineViewProps {
  entries: InvestigationTimelineEntry[];
  /** Shown when several patients appear in one timeline. */
  showPatient?: boolean;
}

export function TimelineView({ entries, showPatient }: TimelineViewProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient Movement Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No timeline events available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const multiplePatients =
    showPatient ?? new Set(sorted.map((e) => e.patient_id)).size > 1;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Patient Movement Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          {sorted.length} recorded events
        </p>
      </CardHeader>
      <CardContent>
        <ol className="relative">
          {sorted.map((entry, i) => {
            const next = sorted[i + 1];
            const gapMinutes = next
              ? (new Date(next.timestamp).getTime() -
                  new Date(entry.timestamp).getTime()) /
                60000
              : 0;
            // Simultaneous events are common (a ward move and a bed move share
            // a timestamp) — a "0m" label there would be noise.
            const showGap = next != null && gapMinutes >= 1;
            const isCulture = entry.event_type === "lab_report";
            const isLast = i === sorted.length - 1;

            return (
              <li key={`${entry.timestamp}-${i}`} className="relative flex gap-4">
                {/* Rail */}
                <div className="relative flex w-3 flex-none justify-center">
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute top-3 h-full w-px border-l-2 border-dotted border-border"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ring-card",
                      isCulture ? "bg-risk-high-foreground" : "bg-primary"
                    )}
                  />
                </div>

                {/* Content */}
                <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-1")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p
                      className={cn(
                        "font-semibold",
                        isCulture ? "text-risk-high-foreground" : "text-foreground"
                      )}
                    >
                      {formatDay(entry.timestamp)} — {eventLabel(entry)}
                    </p>
                    {isCulture && (
                      <Badge variant="riskHigh" size="sm">
                        Culture result
                      </Badge>
                    )}
                    <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[0.9375rem] leading-snug text-muted-foreground">
                    {entry.description}
                  </p>

                  {multiplePatients && (
                    <p className="mt-0.5 text-[0.8125rem] text-muted-foreground/80">
                      {entry.patient_name}
                    </p>
                  )}

                  {/* Elapsed time until the next event */}
                  <p className="py-2 text-[0.8125rem] text-muted-foreground">
                    {showGap ? formatMinutes(gapMinutes) : " "}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
