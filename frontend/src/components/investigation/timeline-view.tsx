"use client";

import type { InvestigationTimelineEntry } from "@/types/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="px-5 pb-6 text-sm text-muted-foreground">
          No timeline events available.
        </div>
      </Card>
    );
  }

  const multiplePatients =
    showPatient ?? new Set(sorted.map((e) => e.patient_id)).size > 1;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="gap-1 border-b border-border bg-muted/40 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Patient Movement Timeline</CardTitle>
          <Badge variant="outline" size="sm" className="bg-card tabular-nums">
            {sorted.length} recorded events
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Chronological record of admissions, moves and results
        </p>
      </CardHeader>

      <ol className="flex-1 px-5 py-1.5">
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
            <li key={`${entry.timestamp}-${i}`} className="flex gap-4">
              {/* Timestamp gutter — pulled out of the body so every event
                  lines up on one column and the prose gets the full width */}
              <div className="w-[68px] flex-none pt-3.5 text-right">
                <p
                  className={cn(
                    "text-[0.8125rem] font-semibold tabular-nums leading-none",
                    isCulture ? "text-risk-high-foreground" : "text-foreground"
                  )}
                >
                  {formatDay(entry.timestamp)}
                </p>
                <p className="mt-1 text-[0.75rem] tabular-nums leading-none text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </p>
              </div>

              {/* Rail */}
              <div className="relative flex w-3 flex-none justify-center">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-4 h-full w-px border-l-2 border-dotted border-border"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 mt-3 h-3 w-3 rounded-full ring-4 ring-card",
                    isCulture ? "bg-risk-high-foreground" : "bg-primary"
                  )}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-1">
                <div
                  className={cn(
                    "rounded-lg px-3 py-2.5 transition-colors",
                    isCulture
                      ? "bg-risk-high/60 ring-1 ring-inset ring-risk-high-foreground/15"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p
                      className={cn(
                        "font-semibold leading-tight",
                        isCulture
                          ? "text-risk-high-foreground"
                          : "text-foreground"
                      )}
                    >
                      {eventLabel(entry)}
                    </p>
                    {isCulture && (
                      <Badge variant="riskHigh" size="sm">
                        Culture result
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 text-[0.875rem] leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>

                  {multiplePatients && (
                    <p className="mt-1 text-[0.8125rem] text-muted-foreground/80">
                      {entry.patient_name}
                    </p>
                  )}
                </div>

                {/* Elapsed time until the next event */}
                <div className="flex h-7 items-center">
                  {showGap && (
                    <span className="ml-3 text-[0.75rem] font-medium tabular-nums text-muted-foreground/70">
                      {formatMinutes(gapMinutes)} later
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
