"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Database, FlaskConical } from "lucide-react";

/**
 * The mock/live data-source switch (zustand `mode`), as a small segmented
 * control at the foot of the ink sidebar. Whether the figures on screen are
 * real is not a preference to bury, so it stays visible at all times.
 */
export function ModeToggle() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="shrink-0 border-t border-ink-line p-3">
      <p className="px-1 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/30">
        Data source
      </p>
      <div
        role="radiogroup"
        aria-label="Data source"
        className="flex gap-1 rounded-lg bg-white/[0.05] p-1"
      >
        {(
          [
            { value: "live", label: "Live", icon: Database },
            { value: "mock", label: "Mock", icon: FlaskConical },
          ] as const
        ).map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => setMode(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                active
                  ? "bg-white/95 text-ink"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
      {mode === "mock" && (
        <p className="mt-2 rounded-md bg-node-downstream/15 px-2.5 py-1.5 font-mono text-[0.625rem] leading-snug text-node-downstream">
          Showing pre-computed fixture data.
        </p>
      )}
    </div>
  );
}
