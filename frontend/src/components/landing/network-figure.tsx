"use client";

import { Component, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  CHAIN_NODES,
  EDGES,
  NODE_BY_ID,
  OTHER_NODES,
  ROLE_COLOR,
  project,
} from "@/components/landing/network-data";
import type { PointerRef } from "@/components/landing/network-canvas";
import { cn } from "@/lib/utils";

/**
 * Hero figure: CASE-2026-001's transmission network.
 *
 * The static SVG below is rendered on the server and is always there. It is
 * the loading placeholder (so the hero never shifts or flashes), the
 * reduced-motion version, and the fallback when WebGL is missing or the 3D
 * chunk fails. When the WebGL scene is allowed it is fetched lazily, and fades
 * in over the SVG once its first frame is painted. Both draw from the same
 * coordinates and camera, so the swap is invisible apart from the motion.
 *
 * With prefers-reduced-motion the 3D chunk is never downloaded: a still scene
 * is what the SVG already is.
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
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function NetworkStatic({ className }: { className?: string }) {
  const nodes = [...OTHER_NODES, ...CHAIN_NODES].map((n) => ({
    ...n,
    p: project(n.position),
  }));
  return (
    <svg
      viewBox="0 0 1000 800"
      aria-hidden
      className={cn("absolute inset-0 h-full w-full", className)}
    >
      {EDGES.map(([a, b]) => {
        const p = project(NODE_BY_ID.get(a)!.position);
        const q = project(NODE_BY_ID.get(b)!.position);
        return (
          <line
            key={`${a}-${b}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke="#1b2333"
            strokeOpacity={0.4}
            strokeWidth={1.4}
          />
        );
      })}
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={n.p.x}
          cy={n.p.y}
          r={n.radius * n.p.scale}
          fill={ROLE_COLOR[n.role]}
        />
      ))}
    </svg>
  );
}

type Mode = "static" | "loading" | "live";

export function NetworkFigure() {
  const ref = useRef<HTMLDivElement>(null);
  const pointer: PointerRef = useRef({ x: 0, y: 0 });
  const [mode, setMode] = useState<Mode>("static");
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  // Decide once, on the client, whether the 3D scene is allowed at all
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => {
      if (reduce.matches || !hasWebGL()) setMode("static");
      else setMode((m) => (m === "live" ? m : "loading"));
    };
    decide();
    reduce.addEventListener("change", decide);
    return () => reduce.removeEventListener("change", decide);
  }, []);

  // Pause when scrolled away or the tab is hidden
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "100px",
    });
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

  const showCanvas = mode === "loading" || mode === "live";

  return (
    <div
      ref={ref}
      className="relative aspect-[5/4] w-full"
      data-network-mode={mode}
    >
      {/* Static network: placeholder, reduced-motion view and fallback */}
      <NetworkStatic
        className={cn(
          "transition-opacity duration-500",
          mode === "live" ? "opacity-0" : "opacity-100"
        )}
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
            />
          </div>
        </CanvasBoundary>
      )}
    </div>
  );
}
