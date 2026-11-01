import { Badge } from "@/components/ui/badge";

/**
 * Case timeline: the temporal contact chart an infection control practitioner
 * would draw on a ward whiteboard — patient lanes across a time axis, staff
 * shift bars, highlighted overlap windows and culture-positive markers.
 *
 * Every timestamp, ward, overlap duration and score below is read straight from
 * the fixture case shipped in src/data/mock_investigation_results.json
 * (CASE-2026-001). It is synthetic data and is labelled as such, so nothing
 * here implies a real patient or a real deployment.
 *
 * Server component, and static: it sits mid-page, so it has no load sequence.
 */

const WINDOW_START = new Date("2026-08-03T00:00:00").getTime();
const WINDOW_END = new Date("2026-08-09T12:00:00").getTime();
const WINDOW_SPAN = WINDOW_END - WINDOW_START;

/** Position of an instant along the time axis, as a percentage of the window. */
function at(iso: string) {
  return ((new Date(iso).getTime() - WINDOW_START) / WINDOW_SPAN) * 100;
}

/** Width of an interval, as a percentage of the window. */
function span(from: string, to: string) {
  return at(to) - at(from);
}

/**
 * One gridline per calendar day. Labels are positioned at the same fractions
 * the .bg-day-rules-light gradient uses (24h of a 156h window = 15.3846%), so a
 * label always sits on its own rule.
 */
const DAYS = ["3", "4", "5", "6", "7", "8", "9"].map((label, i) => ({
  label,
  left: ((i * 24) / (WINDOW_SPAN / 3600000)) * 100,
}));

type Tone = "index" | "vector" | "downstream";

const TONE: Record<Tone, { bar: string; dot: string; text: string }> = {
  index: {
    bar: "bg-node-infected/85",
    dot: "bg-node-infected",
    text: "text-risk-high-foreground",
  },
  vector: {
    bar: "bg-node-location/85",
    dot: "bg-node-location",
    text: "text-node-location-strong",
  },
  downstream: {
    bar: "bg-node-downstream/85",
    dot: "bg-node-downstream",
    text: "text-risk-medium-foreground",
  },
};

const LANES: {
  name: string;
  meta: string;
  role: string;
  tone: Tone;
  bars: { from: string; to: string; label: string }[];
  cultures: string[];
}[] = [
  {
    name: "Rajesh Verma",
    meta: "MRN-2026-1001",
    role: "Index",
    tone: "index",
    bars: [
      {
        from: "2026-08-03T16:00:00",
        to: "2026-08-04T04:00:00",
        label: "ICU",
      },
    ],
    cultures: ["2026-08-03T17:00:00"],
  },
  {
    name: "Anita Sharma",
    meta: "Nurse · staff ID 1",
    role: "Shared attendant",
    tone: "vector",
    bars: [
      {
        from: "2026-08-03T16:00:00",
        to: "2026-08-04T04:00:00",
        label: "ICU",
      },
      {
        from: "2026-08-05T16:00:00",
        to: "2026-08-06T04:00:00",
        label: "GEN MED A",
      },
    ],
    cultures: [],
  },
  {
    name: "Suresh Joshi",
    meta: "MRN-2026-1002",
    role: "Downstream",
    tone: "downstream",
    bars: [
      {
        from: "2026-08-05T16:00:00",
        to: "2026-08-06T04:00:00",
        label: "GEN MED A",
      },
    ],
    cultures: ["2026-08-07T18:00:00"],
  },
  {
    name: "Meenakshi Rao",
    meta: "MRN-2026-1003",
    role: "Downstream",
    tone: "downstream",
    bars: [],
    cultures: ["2026-08-08T19:00:00"],
  },
  {
    name: "Tarun Agarwal",
    meta: "MRN-2026-1004",
    role: "Downstream",
    tone: "downstream",
    bars: [],
    cultures: ["2026-08-08T23:00:00"],
  },
];

/**
 * The two shift overlaps that carry the chain. Each is drawn as a lit column
 * across the chart with the hop it produced linking the two lanes it touches.
 */
const OVERLAPS = [
  { from: "2026-08-03T16:00:00", to: "2026-08-04T04:00:00", lanes: [0, 1] },
  { from: "2026-08-05T16:00:00", to: "2026-08-06T04:00:00", lanes: [1, 2] },
];

const LANE_H = 46;

export function ContactTimeline() {
  return (
    <figure aria-label="Contact timeline for CASE-2026-001, 3 to 9 August 2026" className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Case header */}
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-meta text-muted-foreground">
            CASE-2026-001
          </span>
          <span className="text-copy text-foreground">
            <span className="font-display italic">Klebsiella pneumoniae</span>
            <span className="text-muted-foreground"> · MDR</span>
          </span>
        </div>
        <Badge variant="cluster">Suspected cluster</Badge>
      </figcaption>

      <div className="px-4 pb-5 pt-4 sm:px-6">
        {/* Axis header */}
        <div className="grid grid-cols-[92px_1fr] items-end gap-x-3 sm:grid-cols-[168px_1fr] sm:gap-x-4">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
            Aug 2026
          </span>
          <div className="relative h-4 border-b border-border">
            {DAYS.map((d) => (
              <span
                key={d.label}
                className="absolute bottom-1 pl-1 font-mono text-[0.625rem] tabular-nums text-muted-foreground"
                style={{ left: `${d.left}%` }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>

        {/* Lanes */}
        <div className="relative mt-1.5 grid grid-cols-[92px_1fr] gap-x-3 sm:grid-cols-[168px_1fr] sm:gap-x-4">
          {/* Row labels */}
          <div>
            {LANES.map((lane) => (
              <div
                key={lane.name}
                className="flex flex-col justify-center"
                style={{
                  height: LANE_H,
                }}
              >
                <span className="flex items-center gap-1.5 truncate text-[0.75rem] font-medium text-foreground sm:text-[0.8125rem]">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[lane.tone].dot}`}
                  />
                  <span className="truncate">{lane.name}</span>
                </span>
                <span className="truncate pl-3 font-mono text-[0.625rem] text-muted-foreground">
                  {lane.meta}
                </span>
              </div>
            ))}
          </div>

          {/* Track */}
          <div
            className="bg-day-rules-light relative"
            style={{ height: LANES.length * LANE_H }}
          >
            {/* Overlap windows + the hop each one produced */}
            {OVERLAPS.map((o) => {
              const top = o.lanes[0] * LANE_H + LANE_H / 2;
              const height = (o.lanes[1] - o.lanes[0]) * LANE_H;
              return (
                <div key={o.from}>
                  <div
                    aria-hidden
                    className="absolute inset-y-0 border-x border-dashed border-input/50 bg-sunken/80"
                    style={{
                      left: `${at(o.from)}%`,
                      width: `${span(o.from, o.to)}%`,
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute w-px origin-top bg-foreground/40"
                    style={{
                      left: `calc(${at(o.from)}% + ${span(o.from, o.to) / 2}%)`,
                      top,
                      height,
                    }}
                  />
                </div>
              );
            })}

            {/* Contact and shift bars */}
            {LANES.map((lane, i) =>
              lane.bars.map((bar) => (
                <div
                  key={`${lane.name}-${bar.from}`}
                  className={`absolute flex origin-left items-center overflow-hidden rounded-[5px] px-2 ${TONE[lane.tone].bar}`}
                  style={{
                    left: `${at(bar.from)}%`,
                    width: `${span(bar.from, bar.to)}%`,
                    top: i * LANE_H + LANE_H / 2 - 11,
                    height: 22,
                  }}
                >
                  {/* A 12h bar is 7.7% of the window — only wide enough to
                      carry a ward code on large screens. The chain readout
                      below spells the same hops out in full at every size. */}
                  <span className="hidden whitespace-nowrap font-mono text-[0.5625rem] font-medium uppercase tracking-[0.08em] text-foreground lg:inline">
                    {bar.label}
                  </span>
                </div>
              ))
            )}

            {/* Culture-positive markers */}
            {LANES.map((lane, i) =>
              lane.cultures.map((c, j) => (
                <span
                  key={`${lane.name}-c${j}`}
                  title="Culture positive"
                  className="absolute grid -translate-x-1/2 -translate-y-1/2 h-[18px] w-[18px] place-items-center rounded-full border border-foreground bg-card text-foreground"
                  style={{
                    left: `${at(c)}%`,
                    top: i * LANE_H + LANE_H / 2,
                  }}
                >
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
                    <path
                      d="M5 1.2v7.6M1.2 5h7.6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              ))
            )}
          </div>
        </div>

        {/* The chain itself, written out — always legible, whatever the width */}
        <div
          className="mt-5 border-t border-border pt-4"
        >
          {/* Wraps rather than scrolls, so no scrollbar crosses the panel. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-meta uppercase tracking-[0.06em] text-muted-foreground">
            <span className="rounded-sm bg-sunken px-1.5 py-1 text-foreground">
              CHAIN-001
            </span>
            <span className="text-risk-high-foreground">Rajesh Verma</span>
            <span className="text-muted-foreground">—</span>
            <span>ICU · 720m</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-node-location-strong">Anita Sharma</span>
            <span className="text-muted-foreground">—</span>
            <span>Gen Med A · 720m</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-risk-medium-foreground">Suresh Joshi</span>
          </p>
        </div>

        {/* Legend + score */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-border pt-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { dot: "bg-node-infected", label: "Index patient" },
              { dot: "bg-node-location", label: "Shared attendant" },
              { dot: "bg-node-downstream", label: "Downstream contact" },
            ].map((l) => (
              <li
                key={l.label}
                className="flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
                {l.label}
              </li>
            ))}
            <li
              className="flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground"
            >
              <span className="grid h-3 w-3 place-items-center rounded-full border border-foreground">
                <svg viewBox="0 0 10 10" className="h-1.5 w-1.5" aria-hidden>
                  <path
                    d="M5 1.2v7.6M1.2 5h7.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Culture positive
            </li>
          </ul>

          <div
            className="text-right"
          >
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
              Weighted confidence
            </p>
            <p className="font-display text-[2rem] leading-none text-foreground">
              0.964
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}
