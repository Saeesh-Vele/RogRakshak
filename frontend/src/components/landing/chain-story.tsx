"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAIN_NODES,
  EDGES,
  NODE_BY_ID,
  OTHER_NODES,
  ROLE_COLOR,
  project,
} from "@/components/landing/network-data";
import { cn } from "@/lib/utils";

/**
 * Scroll-linked story of CASE-2026-001 on ink: the network assembles one step
 * per scroll beat — index patient, the nurse hop, the three downstream cases,
 * then the score.
 *
 * It is an SVG, not a second WebGL scene: same projection as the hero, no
 * extra JavaScript, no second GPU context, and nothing to fall back from. The
 * steps are ordinary text in reading order, so keyboard and screen-reader
 * users get the whole story without scrolling effects; the picture is
 * decorative (aria-hidden) and only follows along.
 *
 * Facts per step come from the live API for CASE-2026-001 and the extracted
 * lab report (13 of 16 agents resistant).
 */

const STEPS = [
  {
    when: "03 Aug, 17:00 · ICU",
    title: "One positive culture.",
    body: "Rajesh Verma's endotracheal aspirate grows Klebsiella pneumoniae, MDR. Resistant to 13 of 16 agents tested.",
  },
  {
    when: "03 Aug 16:00 – 04 Aug 04:00 · ICU",
    title: "A nurse shares his shift.",
    body: "Nurse Anita Sharma overlaps his ICU stay for 720 minutes. Contact event EVT-PS-0517515181c9b133.",
  },
  {
    when: "From 05 Aug · General Medicine A",
    title: "Her next shifts reach three more patients.",
    body: "Suresh Joshi, Meenakshi Rao and Tarun Agarwal each overlap her for 720 minutes, then culture positive on 07–08 Aug.",
  },
  {
    when: "Scored",
    title: "0.964. Suspected cluster.",
    body: "Five weighted dimensions over 15 evidence items. A hypothesis for infection control to review, not a confirmed transmission.",
  },
];

/** Which step reveals each chain node / edge. */
const NODE_STEP: Record<string, number> = { index: 0, staff: 1, d1: 2, d2: 2, d3: 2 };
const EDGE_STEP = (from: string) => (from === "index" ? 1 : 2);

function StoryGraph({ step }: { step: number }) {
  const label = (a: string, b: string, text: string) => {
    const p = project(NODE_BY_ID.get(a)!.position);
    const q = project(NODE_BY_ID.get(b)!.position);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, text };
  };
  const hop1 = label("index", "staff", "720 min · ICU");

  return (
    <svg viewBox="80 60 860 700" className="h-full w-full" aria-hidden>
      {OTHER_NODES.map((n) => {
        const p = project(n.position);
        return (
          <circle key={n.id} cx={p.x} cy={p.y} r={n.radius * p.scale} fill="white" fillOpacity={0.16} />
        );
      })}

      {EDGES.map(([a, b]) => {
        const p = project(NODE_BY_ID.get(a)!.position);
        const q = project(NODE_BY_ID.get(b)!.position);
        const on = step >= EDGE_STEP(a);
        return (
          <line
            key={`${a}-${b}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            pathLength={1}
            stroke="white"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="1 1"
            strokeDashoffset={on ? 0 : 1}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        );
      })}

      {/* Hop label, once the nurse hop is drawn */}
      <text
        x={hop1.x + 10}
        y={hop1.y - 16}
        textAnchor="start"
        className={cn(
          "fill-white font-mono text-[22px] transition-opacity duration-500",
          step >= 1 ? "opacity-80" : "opacity-0"
        )}
      >
        {hop1.text}
      </text>

      {CHAIN_NODES.map((n) => {
        const p = project(n.position);
        const on = step >= NODE_STEP[n.id];
        const r = n.radius * p.scale;
        return (
          <g
            key={n.id}
            className="transition-opacity duration-500"
            style={{ opacity: on ? 1 : 0 }}
          >
            {/* The index patient keeps a ring: it is where the case starts */}
            {n.role === "index" && (
              <circle cx={p.x} cy={p.y} r={r + 14} fill="none" stroke={ROLE_COLOR.index} strokeOpacity={0.6} strokeWidth={2} />
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={ROLE_COLOR[n.role]} />
            <text
              x={p.x}
              y={p.y + r + 34}
              textAnchor="middle"
              className="fill-white text-[22px]"
              fillOpacity={0.85}
            >
              {n.label?.replace("Nurse ", "")}
            </text>
          </g>
        );
      })}

      {/* The score lands last */}
      <g
        className="transition-opacity duration-700"
        style={{ opacity: step >= 3 ? 1 : 0 }}
      >
        {/* Top right is the one region the chain never reaches */}
        <text x={930} y={140} textAnchor="end" className="fill-white font-display text-[88px]">
          0.964
        </text>
        <text
          x={930}
          y={174}
          textAnchor="end"
          className="font-mono text-[22px] uppercase tracking-[0.12em]"
          fill={ROLE_COLOR.index}
        >
          Suspected cluster
        </text>
      </g>
    </svg>
  );
}

export function ChainStory() {
  const [step, setStep] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The step crossing the middle of the viewport is the active one
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative grid lg:grid-cols-2 lg:gap-16">
      {/* The picture: pinned while the steps scroll past */}
      <div className="sticky top-0 z-10 h-[46vh] bg-foreground lg:order-2 lg:h-screen lg:py-[12vh]">
        <StoryGraph step={step} />
      </div>

      <ol className="relative lg:order-1">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step={i}
            className="flex min-h-[64vh] flex-col justify-center py-10 lg:min-h-[72vh]"
          >
            <p className="flex items-center gap-3 font-mono text-meta text-white/70">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full border text-[0.6875rem] transition-colors duration-300",
                  step === i
                    ? "border-white bg-white text-foreground"
                    : "border-white/40 text-white/70"
                )}
              >
                {i + 1}
              </span>
              {s.when}
            </p>
            <h3
              className={cn(
                "mt-4 max-w-md text-balance font-display text-[2rem] leading-[1.1] tracking-[-0.015em] transition-colors duration-300 sm:text-[2.5rem]",
                step === i ? "text-white" : "text-white/55"
              )}
            >
              {s.title}
            </h3>
            <p className="mt-3 max-w-md text-copy leading-relaxed text-white/75">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
