"use client";

import { useRef } from "react";
import {
  CHAIN_NODES,
  EDGES,
  NODE_BY_ID,
  ROLE_COLOR,
  project,
} from "@/components/landing/network-data";
import {
  progressExpr,
  revealStyle,
  useScrollProgress,
} from "@/components/landing/use-scroll-progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Lab PDF → extracted fields → contact events → temporal graph → weighted
 * score, for CASE-2026-001. Every value is real:
 *
 *   data/lab_reports/lab_report_001.pdf, extracted by gemini-2.5-flash
 *     (data/lab_reports/extracted_reports.json)
 *   GET /graph/patient/1/contacts — 31 contact events; the chain's first hop
 *     is EVT-PS-0517515181c9b133
 *   GET /api/investigations/CASE-2026-001 — chains, scoring, status
 *
 * Draws itself as it scrolls into view (see use-scroll-progress.ts). Without
 * JS or with reduced motion it renders finished.
 */

const STAGE = 0.19; // progress between stage reveals

/** Ordered for display; 13 R, 1 I, 2 S across 16 agents. */
const AST: ("R" | "I" | "S")[] = [
  ...Array<"R">(13).fill("R"),
  "I",
  "S",
  "S",
];

/**
 * Where the chain's first hop falls among the index patient's 31 contact
 * events, sorted by start time (GET /graph/patient/1/contacts).
 */
const CHAIN_EVENT_INDEX = 4;

const DIMENSIONS = [
  { label: "Temporal contact overlap", weight: 0.3, scored: 0.276 },
  { label: "Microbiological match", weight: 0.25, scored: 0.25 },
  { label: "Resistance phenotype", weight: 0.2, scored: 0.2 },
  { label: "Shared clinical intermediary", weight: 0.15, scored: 0.15 },
  { label: "Specimen clustering", weight: 0.1, scored: 0.088 },
];

function Connector({ i }: { i: number }) {
  const t = progressExpr(i * STAGE + 0.1, 0.1);
  return (
    <li
      aria-hidden
      className="relative flex items-center justify-center max-xl:h-8 max-xl:w-full xl:h-full xl:w-8"
      style={{ ["--t" as string]: t }}
    >
      {/* Horizontal between columns on xl, vertical when the stages stack */}
      <span className="absolute bg-foreground max-xl:left-[22px] max-xl:top-0 max-xl:h-full max-xl:w-px max-xl:origin-top max-xl:[transform:scale(1,var(--t))] xl:left-0 xl:top-1/2 xl:h-px xl:w-full xl:origin-left xl:[transform:scale(var(--t),1)]" />
      {/* Arrowhead appears once the line has arrived */}
      <span
        className="absolute h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-foreground max-xl:bottom-0 max-xl:left-[19px] max-xl:rotate-90 xl:right-0 xl:top-1/2 xl:-translate-y-1/2"
        style={{ opacity: "var(--t)" }}
      />
    </li>
  );
}

function Stage({
  i,
  label,
  title,
  children,
  className,
}: {
  i: number;
  label: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn("flex min-w-0 flex-col rounded-lg border border-border bg-card p-4", className)}
      style={revealStyle(i * STAGE)}
    >
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-meta text-primary">{String(i + 1).padStart(2, "0")}</span>
        <span className="label-caps">{label}</span>
      </p>
      <h3 className="mt-1 text-ui font-semibold text-foreground">{title}</h3>
      <div className="mt-3 flex-1">{children}</div>
    </li>
  );
}

function Field({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="border-t border-border py-1.5 first:border-t-0 first:pt-0">
      <dt className="font-mono text-[0.6875rem] text-muted-foreground">{k}</dt>
      <dd className={cn("truncate text-ui text-foreground", mono && "font-mono text-[0.75rem]")}>{v}</dd>
    </div>
  );
}

function MiniGraph() {
  const box = { x: 160, y: 120, w: 700, h: 560 };
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className="h-[150px] w-full"
      role="img"
      aria-label="Rajesh Verma to Nurse Anita Sharma to three downstream patients"
    >
      {EDGES.map(([a, b], k) => {
        const p = project(NODE_BY_ID.get(a)!.position);
        const q = project(NODE_BY_ID.get(b)!.position);
        // index → nurse first, then the fan-out
        const t = progressExpr(3 * STAGE + 0.05 + (k === 0 ? 0 : 0.06), 0.08);
        return (
          <line
            key={`${a}-${b}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            pathLength={1}
            stroke="hsl(var(--foreground))"
            strokeOpacity={0.55}
            strokeWidth={3}
            strokeDasharray="1 1"
            style={{ strokeDashoffset: `calc(1 - ${t})` }}
          />
        );
      })}
      {CHAIN_NODES.map((n) => {
        const p = project(n.position);
        return (
          <circle
            key={n.id}
            cx={p.x}
            cy={p.y}
            r={n.radius * p.scale * 1.15}
            fill={ROLE_COLOR[n.role]}
          />
        );
      })}
    </svg>
  );
}

export function PipelineDiagram() {
  const ref = useRef<HTMLOListElement>(null);
  useScrollProgress(ref, "reveal");

  return (
    <ol
      ref={ref}
      aria-label="CASE-2026-001 through the pipeline"
      className="grid grid-cols-1 xl:grid-cols-[repeat(4,minmax(0,1fr)_2rem)_minmax(0,1fr)]"
    >
      <Stage i={0} label="Lab report" title="A microbiology PDF">
        <div aria-hidden className="relative mx-auto h-[118px] w-[92px] rounded-sm border border-input bg-background p-2.5">
          <span className="block h-1.5 w-10 bg-foreground/70" />
          <span className="mt-2 block h-1 w-full bg-border" />
          <span className="mt-1 block h-1 w-4/5 bg-border" />
          <span className="mt-1 block h-1 w-full bg-border" />
          <span className="mt-3 grid grid-cols-4 gap-[3px]">
            {Array.from({ length: 16 }, (_, k) => (
              <span key={k} className="h-1 bg-border" />
            ))}
          </span>
          <span className="absolute -right-1.5 -top-1.5 rounded-sm bg-foreground px-1 py-0.5 font-mono text-[0.5625rem] text-background">
            PDF
          </span>
        </div>
        <p className="mt-3 truncate text-center font-mono text-[0.75rem] text-foreground">
          lab_report_001.pdf
        </p>
        <p className="text-center text-meta text-muted-foreground">
          Endotracheal aspirate · 03 Aug
        </p>
      </Stage>
      <Connector i={0} />

      <Stage i={1} label="Extract" title="Fields, read by Gemini">
        <dl>
          <Field k="organism" v={<span className="italic">Klebsiella pneumoniae</span>} mono={false} />
          <Field k="resistance_profile" v="MDR" />
          <Field k="collected_at" v="2026-08-03T17:00" />
          <div className="border-t border-border pt-1.5">
            <dt className="break-all font-mono text-[0.6875rem] text-muted-foreground">
              antimicrobial_susceptibility
            </dt>
            <dd className="mt-1">
              <span aria-hidden className="flex gap-[2px]">
                {AST.map((r, k) => (
                  <span
                    key={k}
                    className={cn(
                      "h-3 flex-1",
                      r === "R" && "bg-risk-high-foreground",
                      r === "I" && "bg-node-downstream",
                      r === "S" && "bg-border"
                    )}
                  />
                ))}
              </span>
              <span className="mt-1 block font-mono text-[0.6875rem] text-foreground">
                16 agents · 13 R · 1 I · 2 S
              </span>
            </dd>
          </div>
        </dl>
      </Stage>
      <Connector i={1} />

      <Stage i={2} label="Contact events" title="31 for the index patient">
        <div aria-hidden className="flex h-5 items-end gap-[2px]">
          {Array.from({ length: 31 }, (_, k) => (
            <span
              key={k}
              className={cn("w-full", k === CHAIN_EVENT_INDEX ? "h-5 bg-node-location" : "h-2.5 bg-border")}
            />
          ))}
        </div>
        <p className="mt-1 text-meta text-muted-foreground">One of them starts the chain:</p>
        <dl className="mt-2">
          <Field k="event_id" v="EVT-PS-0517515181c9b133" />
          <Field k="location" v="Intensive Care Unit (ICU)" mono={false} />
          <Field k="overlap_minutes" v={<span className="font-semibold">720</span>} />
          <Field k="source_record_ids" v="movement 2 · staff mvmt 5" />
        </dl>
      </Stage>
      <Connector i={2} />

      <Stage i={3} label="Temporal graph" title="Three chains, one nurse">
        <MiniGraph />
        <p className="mt-2 text-meta text-muted-foreground">
          Index → Nurse Anita Sharma → 3 downstream. Every hop 720 min.
        </p>
      </Stage>
      <Connector i={3} />

      <Stage i={4} label="Score" title="Five weighted dimensions">
        <ul className="space-y-2">
          {DIMENSIONS.map((d, k) => (
            <li key={d.label}>
              <span className="sr-only">
                {d.label}: {d.scored} of {d.weight}
              </span>
              <span aria-hidden className="block h-1.5 bg-sunken" style={{ width: `${(d.weight / 0.3) * 100}%` }}>
                <span
                  className="block h-full origin-left bg-primary"
                  style={{
                    width: `${(d.scored / d.weight) * 100}%`,
                    transform: `scaleX(${progressExpr(4 * STAGE + 0.04 + k * 0.02, 0.08)})`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-col items-start gap-1.5">
          <span className="font-display text-[2.25rem] leading-none text-foreground">0.964</span>
          <Badge variant="cluster">Suspected cluster</Badge>
        </p>
      </Stage>
    </ol>
  );
}
