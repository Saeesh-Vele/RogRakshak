"use client";

import { useEffect, useId, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { CaseEvent } from "@/components/landing/case-facts";
import { formatTime } from "@/components/landing/network-view";
import { cn } from "@/lib/utils";

/**
 * Replays CASE-2026-001 on its real clock: 03 Aug 16:00, when the nurse's ICU
 * shift with the index patient begins, to 08 Aug 23:00, the last downstream
 * culture. Every tick is a timestamp from the case data.
 *
 * A native <input type="range"> (keyboard: arrows step 30 min, PageUp/Down a
 * few hours, Home/End the ends) with spoken value text. Play is always the
 * user's choice — it never starts on its own — and with reduced motion it steps
 * from event to event instead of sweeping.
 */

const STEP_MS = 30 * 60 * 1000;
const PLAY_SECONDS = 12;

export function TimeScrubber({
  events,
  start,
  end,
  value,
  onChange,
  playing,
  onPlayingChange,
  reducedMotion,
}: {
  events: CaseEvent[];
  start: number;
  end: number;
  value: number;
  onChange: (t: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  reducedMotion: boolean;
}) {
  const id = useId();
  const last = useRef<number | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Play: sweep (or step, with reduced motion) to the end, then stop
  useEffect(() => {
    if (!playing) return;
    if (reducedMotion) {
      const times = events.map((e) => new Date(e.at).getTime());
      const t = setInterval(() => {
        const next = times.find((x) => x > valueRef.current);
        if (next === undefined) {
          onPlayingChange(false);
          return;
        }
        onChange(next);
      }, 1400);
      return () => clearInterval(t);
    }
    let raf = 0;
    last.current = null;
    const rate = (end - start) / (PLAY_SECONDS * 1000);
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      const next = Math.min(end, valueRef.current + dt * rate);
      onChange(next);
      if (next >= end) onPlayingChange(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion, events, start, end, onChange, onPlayingChange]);

  const current = [...events].reverse().find((e) => new Date(e.at).getTime() <= value) ?? null;
  const atEnd = value >= end;
  const pct = (t: number) => ((t - start) / (end - start)) * 100;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="label-caps text-foreground">
          Replay the case
        </label>
        <span className="font-mono text-meta text-foreground" aria-hidden>
          {formatTime(value)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!playing && atEnd) onChange(start);
            onPlayingChange(!playing);
          }}
          aria-label={playing ? "Pause replay" : atEnd ? "Replay from the start" : "Play replay"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-input max-sm:h-11 max-sm:w-11"
        >
          {playing ? <Pause className="h-4 w-4" /> : atEnd ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <div className="relative flex-1">
          {/* Event ticks, at their real times */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2">
            {events.map((e) => {
              const t = new Date(e.at).getTime();
              return (
                <span
                  key={e.at + e.kind}
                  className={cn(
                    "absolute top-0 h-3 w-px -translate-x-1/2",
                    e.kind === "culture" ? "bg-risk-high-foreground" : "bg-foreground/50",
                    t > value && "opacity-40"
                  )}
                  style={{ left: `${pct(t)}%` }}
                />
              );
            })}
          </div>
          <input
            id={id}
            type="range"
            min={start}
            max={end}
            step={STEP_MS}
            value={value}
            onChange={(e) => {
              onPlayingChange(false);
              onChange(Number(e.target.value));
            }}
            aria-valuetext={`${formatTime(value)}${current ? `: ${current.text}` : ""}`}
            className="relative h-9 w-full cursor-pointer accent-[hsl(var(--primary))] max-sm:h-11"
          />
        </div>
      </div>

      <p className="mt-1.5 min-h-[2.5rem] text-meta text-muted-foreground" aria-live="polite">
        {atEnd ? (
          <>The full case. Drag, use the arrow keys, or press play to watch it happen in order.</>
        ) : current ? (
          <>
            <span className={cn("font-mono", current.kind === "culture" ? "text-risk-high-foreground" : "text-foreground")}>
              {formatTime(current.at)}
            </span>{" "}
            {current.text}
          </>
        ) : (
          "Before the first recorded overlap."
        )}
      </p>
    </div>
  );
}
