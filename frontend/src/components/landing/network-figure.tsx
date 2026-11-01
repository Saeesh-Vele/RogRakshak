"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  CHAIN_NODES,
  EDGES,
  NODE_BY_ID,
  OTHER_NODES,
  OTHER_PATIENT_COUNT,
  ROLE_COLOR,
  project,
} from "@/components/landing/network-data";
import type { PointerRef } from "@/components/landing/network-canvas";
import type { CaseFacts, FactNodeId } from "@/components/landing/case-facts";
import { computeView, describeNode, highlight, type NetworkView } from "@/components/landing/network-view";
import { TimeScrubber } from "@/components/landing/time-scrubber";
import { cn } from "@/lib/utils";

/**
 * Hero figure: CASE-2026-001's transmission network, interactive.
 *
 * The static SVG is rendered on the server and is always there: the loading
 * placeholder (no shift, no flash), the reduced-motion version and the
 * fallback when WebGL is missing or the 3D chunk fails. When WebGL is allowed
 * the scene loads lazily and fades in over it. Both draw from the same
 * coordinates, camera and view state, so selection, the unlinked toggle and
 * the time scrubber behave the same in either.
 *
 * Everything the pointer can reach is also reachable from the controls below
 * the figure: person buttons (select / highlight), the unlinked toggle, and a
 * native range input for the timeline.
 */

const NetworkCanvas = dynamic(() => import("@/components/landing/network-canvas"), {
  ssr: false,
  loading: () => null,
});

class CanvasBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    // Release the probe straight away: browsers cap live WebGL contexts, and
    // this one would otherwise linger until garbage collection.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * The network as SVG. With no `view` it renders exactly the still image used
 * on the login screen; with one it follows the hero's selection, toggle and
 * timeline (reduced-motion and no-WebGL visitors use it interactively).
 */
export function NetworkStatic({
  className,
  view,
  lit,
  onSelect,
}: {
  className?: string;
  view?: NetworkView;
  lit?: ReturnType<typeof highlight>;
  onSelect?: (id: FactNodeId | null) => void;
}) {
  return (
    <svg viewBox="0 0 1000 800" aria-hidden className={cn("absolute inset-0 h-full w-full", className)}>
      {EDGES.map(([a, b]) => {
        const key = `${a}-${b}`;
        const p = project(NODE_BY_ID.get(a)!.position);
        const q = project(NODE_BY_ID.get(b)!.position);
        const t = view ? view.edgeProgress[key] ?? 1 : 1;
        if (t <= 0) return null;
        const isLit = lit?.edges.has(key);
        return (
          <line
            key={key}
            x1={p.x}
            y1={p.y}
            x2={p.x + (q.x - p.x) * t}
            y2={p.y + (q.y - p.y) * t}
            stroke={isLit ? "#1f497a" : "#1b2333"}
            strokeOpacity={lit ? (isLit ? 0.9 : 0.08) : 0.4}
            strokeWidth={isLit ? 2.6 : 1.4}
          />
        );
      })}
      <g style={view ? { opacity: view.showUnlinked ? (lit ? 0.25 : 1) : 0, transition: "opacity 300ms ease" } : undefined}>
        {OTHER_NODES.map((n) => {
          const p = project(n.position);
          return <circle key={n.id} cx={p.x} cy={p.y} r={n.radius * p.scale} fill={ROLE_COLOR.other} />;
        })}
      </g>
      {CHAIN_NODES.map((n) => {
        const p = project(n.position);
        const r = n.radius * p.scale;
        const id = n.id as FactNodeId;
        const visible = view ? Boolean(view.nodeVisible[id]) : true;
        const dim = lit && !lit.nodes.has(id);
        return (
          <g
            key={n.id}
            style={view ? { opacity: visible ? (dim ? 0.16 : 1) : 0, transition: "opacity 300ms ease" } : undefined}
            onClick={onSelect ? () => visible && onSelect(view?.selected === id ? null : id) : undefined}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            {view?.timeline && view.cultured[id] && (
              <circle cx={p.x} cy={p.y} r={r * 1.55} fill="none" stroke={ROLE_COLOR.index} strokeWidth={3} />
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={ROLE_COLOR[n.role]} />
          </g>
        );
      })}
    </svg>
  );
}

type Mode = "static" | "loading" | "live";

const GROUPS: { role: "index" | "staff" | "downstream"; label: string; ids: FactNodeId[] }[] = [
  { role: "index", label: "Index patient", ids: ["index"] },
  { role: "staff", label: "Shared attendant", ids: ["staff"] },
  { role: "downstream", label: "Downstream", ids: ["d1", "d2", "d3"] },
];

export function NetworkFigure({ facts }: { facts: CaseFacts }) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer: PointerRef = useRef({ x: 0, y: 0 });
  const [mode, setMode] = useState<Mode>("static");
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  const start = useMemo(() => new Date(facts.start).getTime(), [facts.start]);
  const end = useMemo(() => new Date(facts.end).getTime(), [facts.end]);
  const [selected, setSelected] = useState<FactNodeId | null>(null);
  const [hovered, setHovered] = useState<FactNodeId | null>(null);
  const [showUnlinked, setShowUnlinked] = useState(true);
  const [time, setTime] = useState(end);
  const [playing, setPlaying] = useState(false);

  const view = useMemo(() => computeView(facts, time, selected, showUnlinked), [facts, time, selected, showUnlinked]);
  const lit = useMemo(() => highlight(facts, selected), [facts, selected]);

  // A person who has not entered the picture yet cannot stay selected
  useEffect(() => {
    if (selected && !view.nodeVisible[selected]) setSelected(null);
  }, [selected, view.nodeVisible]);

  // Decide once, on the client, whether the 3D scene is allowed at all
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => {
      setReduced(mq.matches);
      if (mq.matches || !hasWebGL()) setMode("static");
      else setMode((m) => (m === "live" ? m : "loading"));
    };
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  // Pause when scrolled away or the tab is hidden
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Pointer parallax, from anywhere in the hero — the figure sits beside the text
  useEffect(() => {
    if (mode === "static") return;
    function onMove(e: PointerEvent) {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mode]);

  // Escape clears a selection
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const onSelect = useCallback((id: FactNodeId | null) => setSelected(id), []);
  const showCanvas = mode === "loading" || mode === "live";
  const detail = selected ? describeNode(facts, selected) : null;

  return (
    <div>
      <div ref={ref} className="relative aspect-[5/4] w-full" data-network-mode={mode}>
        <div
          aria-hidden
          className="bg-graph-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_50%,black,transparent)]"
        />
        {/* Static network: placeholder, reduced-motion view and fallback */}
        <NetworkStatic
          view={view}
          lit={lit}
          onSelect={mode === "static" ? onSelect : undefined}
          className={cn("transition-opacity duration-500", mode === "live" ? "pointer-events-none opacity-0" : "opacity-100")}
        />

        {showCanvas && (
          <CanvasBoundary onError={() => setMode("static")}>
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                mode === "live" ? "opacity-100" : "opacity-0"
              )}
            >
              <NetworkCanvas
                active={inView && pageVisible}
                pointer={pointer}
                onReady={() => setMode("live")}
                facts={facts}
                view={view}
                hovered={hovered}
                onHover={setHovered}
                onSelect={onSelect}
              />
            </div>
          </CanvasBoundary>
        )}
      </div>

      {/* The figure's keyboard and touch controls */}
      <div className="border-t border-border pt-3">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-mono text-meta text-foreground">{facts.caseId}</span>
          <span className="text-meta text-muted-foreground">
            Three chains, each hop a 12-hour shift overlap · synthetic data
          </span>
        </p>

        <div role="group" aria-label="People in the case" className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {GROUPS.map((g) => (
            <span key={g.role} className="flex flex-wrap items-center gap-1">
              <span className="label-caps mr-0.5">{g.label}</span>
              {g.ids.map((id) => {
                const on = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(on ? null : id)}
                    onPointerEnter={() => setHovered(id)}
                    onPointerLeave={() => setHovered(null)}
                    disabled={!view.nodeVisible[id]}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-1.5 rounded-sm border px-2 text-meta transition-colors max-sm:min-h-11",
                      on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-input",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROLE_COLOR[g.role] }} />
                    {facts.nodes[id].name.replace("Nurse ", "")}
                  </button>
                );
              })}
            </span>
          ))}
          <button
            type="button"
            aria-pressed={showUnlinked}
            onClick={() => setShowUnlinked((v) => !v)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-sm border px-2 text-meta transition-colors max-sm:min-h-11",
              showUnlinked ? "border-border bg-card text-foreground hover:border-input" : "border-dashed border-input text-muted-foreground"
            )}
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: ROLE_COLOR.other, opacity: showUnlinked ? 1 : 0.4 }} />
            {showUnlinked ? "Hide" : "Show"} the {OTHER_PATIENT_COUNT} unlinked patients
          </button>
        </div>

        <p role="status" className="mt-2 min-h-[2.5rem] text-meta text-muted-foreground">
          {detail ? (
            <>
              <span className="font-medium text-foreground">{detail.name}</span> · {detail.role}
              {detail.mrn && <span className="font-mono"> · {detail.mrn}</span>}
              {detail.lines.map((l) => (
                <span key={l} className="block">{l}</span>
              ))}
            </>
          ) : (
            <>Hover or tap a person, or pick one above, to light up their links. Esc clears.</>
          )}
        </p>

        <TimeScrubber
          events={facts.events}
          start={start}
          end={end}
          value={time}
          onChange={setTime}
          playing={playing}
          onPlayingChange={setPlaying}
          reducedMotion={reduced}
        />
      </div>
    </div>
  );
}

