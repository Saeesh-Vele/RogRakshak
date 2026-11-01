"use client";

import type { InvestigationTimelineEntry } from "@/types/api";
import type { WardStay } from "@/lib/patient-placement";
import { formatMinutes } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * The index patient's stay on a real time axis, then the same events as a
 * chronological list.
 *
 * Axis: one tick per calendar day; ward stays drawn from their recorded entry
 * and exit times (`stays`, from /graph/patient/{id}/timeline — omitted when the
 * live service is not in use, never guessed); admission, procedure, culture
 * and discharge as markers. The culture is the only red mark, because it is
 * the only risk event.
 *
 * The axis is a picture (aria-hidden); the list underneath carries every
 * event, in order, for everyone.
 */

const MARKED = new Set(["admission", "procedure", "lab_report", "discharge"]);

const EVENT_LABELS: Record<string, string> = {
  admission: "Admission",
  discharge: "Discharge",
  movement: "Moved",
  lab_report: "Culture",
  procedure: "Procedure",
};

function fmt(iso: string, withTime = true) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  if (!withTime) return day;
  return `${day} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function Axis({ entries, stays }: { entries: InvestigationTimelineEntry[]; stays?: WardStay[] }) {
  const times = [
    ...entries.map((e) => new Date(e.timestamp).getTime()),
    ...(stays ?? []).flatMap((s) => [new Date(s.start).getTime(), new Date(s.end).getTime()]),
  ];
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const span = Math.max(t1 - t0, 3600_000);
  const x = (iso: string) => ((new Date(iso).getTime() - t0) / span) * 100;

  // Midnight ticks inside the window
  const ticks: string[] = [];
  const d = new Date(t0);
  d.setHours(24, 0, 0, 0);
  for (; d.getTime() <= t1; d.setDate(d.getDate() + 1)) ticks.push(d.toISOString());
  const thin = ticks.length > 7;

  const markers = entries.filter((e) => MARKED.has(e.event_type));
  // Two label lanes below the axis, so close events do not overprint
  const below = markers.filter((m) => m.event_type !== "lab_report");
  const lanes: number[] = [];
  const laneOf = below.map((m) => {
    const pos = x(m.timestamp);
    let lane = lanes.findIndex((end) => pos - end > 16);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = pos;
    return lane;
  });

  return (
    <div
      aria-hidden
      // Marker labels are hidden below sm, so the axis needs no room for them there
      className="relative mx-2 mb-2 mt-8 max-sm:!h-[68px]"
      style={{ height: 112 + Math.max(0, lanes.length - 1) * 18 }}
    >
      {/* Culture labels above the axis, in red */}
      {markers
        .filter((m) => m.event_type === "lab_report")
        .map((m) => (
          <span
            key={`c-${m.timestamp}`}
            className={cn(
              "absolute -top-7 whitespace-nowrap font-mono text-[0.6875rem] font-medium text-risk-high-foreground",
              // Anchor inward near either end so the label is never clipped
              x(m.timestamp) < 30 ? "-translate-x-2" : x(m.timestamp) > 70 ? "-translate-x-[calc(100%-0.5rem)]" : "-translate-x-1/2"
            )}
            style={{ left: `${x(m.timestamp)}%` }}
          >
            Culture positive · {fmt(m.timestamp)}
          </span>
        ))}

      {/* Ward stays, from recorded entry and exit */}
      <div className="absolute inset-x-0 top-0 h-6">
        {stays && stays.length > 0 ? (
          stays.map((s) => (
            <span
              key={s.start + s.ward}
              className="absolute top-0 flex h-6 items-center overflow-hidden border border-input/60 bg-sunken px-2"
              style={{ left: `${x(s.start)}%`, width: `${x(s.end) - x(s.start)}%` }}
              title={`${s.ward}: ${fmt(s.start)} – ${fmt(s.end)}`}
            >
              <span className="truncate text-[0.6875rem] text-foreground">{s.ward}</span>
            </span>
          ))
        ) : null}
      </div>

      {/* The axis */}
      <div className="absolute inset-x-0 top-10 border-t border-foreground/70" />
      {ticks.map((t, i) => (
        <span key={t} className="absolute top-10" style={{ left: `${x(t)}%` }}>
          <span className="absolute h-1.5 border-l border-foreground/50" />
          <span
            className={cn(
              "absolute top-2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground",
              thin && i % 2 === 1 && "max-sm:hidden"
            )}
          >
            {fmt(t, false)}
          </span>
        </span>
      ))}

      {/* Event markers */}
      {markers.map((m) => {
        const culture = m.event_type === "lab_report";
        return (
          <span
            key={`m-${m.event_type}-${m.timestamp}`}
            className={cn(
              "absolute top-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
              culture ? "z-10 border-risk-high-foreground bg-risk-high-foreground" : "border-foreground bg-card"
            )}
            style={{ left: `${x(m.timestamp)}%` }}
          />
        );
      })}
      {below.map((m, i) => (
        <span
          key={`l-${m.event_type}-${m.timestamp}`}
          className="absolute -translate-x-1/2 whitespace-nowrap text-[0.6875rem] text-foreground max-sm:hidden"
          style={{ left: `${Math.min(94, Math.max(6, x(m.timestamp)))}%`, top: 74 + laneOf[i] * 18 }}
        >
          {EVENT_LABELS[m.event_type]}
        </span>
      ))}
    </div>
  );
}

interface TimelineViewProps {
  entries: InvestigationTimelineEntry[];
  /** Recorded ward stays for the same patient; drawn as bars when present. */
  stays?: WardStay[];
  /** Kept for callers that pass it; the list always shows the patient when several appear. */
  showPatient?: boolean;
  /** Say why stay bars are missing (off for static snapshots, which never have them). */
  explainMissingStays?: boolean;
}

export function TimelineView({ entries, stays, showPatient, explainMissingStays = true }: TimelineViewProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return <p className="py-6 text-ui text-muted-foreground">No timeline events recorded.</p>;
  }

  const multiplePatients = showPatient ?? new Set(sorted.map((e) => e.patient_id)).size > 1;

  return (
    <div>
      <Axis entries={sorted} stays={stays} />
      {explainMissingStays && !stays?.length && (
        <p className="mb-2 text-meta text-muted-foreground">
          Ward stay bars need the live service; the events below are complete.
        </p>
      )}

      <ol className="divide-hairline border-t border-border">
        {sorted.map((entry, i) => {
          const culture = entry.event_type === "lab_report";
          const next = sorted[i + 1];
          const gap = next
            ? (new Date(next.timestamp).getTime() - new Date(entry.timestamp).getTime()) / 60000
            : 0;
          return (
            <li
              key={`${entry.timestamp}-${i}`}
              className={cn(
                "grid grid-cols-[6.5rem_1fr] gap-x-4 py-2.5 sm:grid-cols-[7.5rem_7rem_1fr]",
                culture && "border-l-2 border-l-risk-high-foreground pl-3"
              )}
            >
              <span className="font-mono text-meta text-muted-foreground">{fmt(entry.timestamp)}</span>
              <span
                className={cn(
                  "text-ui font-medium",
                  culture ? "text-risk-high-foreground" : "text-foreground"
                )}
              >
                {culture ? "Culture positive" : EVENT_LABELS[entry.event_type] ?? entry.event_type}
                {entry.location && entry.event_type === "movement" && (
                  <span className="font-normal text-muted-foreground"> · {entry.location}</span>
                )}
              </span>
              <span className="col-start-2 text-ui text-muted-foreground sm:col-start-3">
                {entry.description}
                {multiplePatients && <span className="block text-meta">{entry.patient_name}</span>}
                {next && gap >= 60 && (
                  <span className="block font-mono text-[0.6875rem] text-muted-foreground">
                    next event {formatMinutes(gap)} later
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
