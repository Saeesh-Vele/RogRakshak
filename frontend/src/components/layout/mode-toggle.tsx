"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Database, FlaskConical } from "lucide-react";

/**
 * Live / Mock data-source segmented control.
 * Uses a sliding white pill — position animated via transform — for a
 * smooth, professional transition instead of a simple color swap.
 */
export function ModeToggle() {
  const { mode, setMode } = useAppStore();
  const isLive = mode === "live";

  return (
    <div className="shrink-0 border-t border-border p-3">
      <p className="px-1 pb-2 text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Data Source
      </p>

      {/* Segmented control */}
      <div
        role="radiogroup"
        aria-label="Data source"
        className="relative flex rounded-lg bg-muted p-1"
      >
        {/* Sliding indicator — uses transform for GPU-accelerated animation */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-md bg-card shadow-sm transition-transform duration-200 ease-out"
          style={{ width: "calc(50% - 4px)", transform: isLive ? "translateX(0)" : "translateX(calc(100% + 4px))" }}
        />

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
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(opt.value)}
              className={cn(
                "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors duration-150",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <opt.icon className="h-3.5 w-3.5 shrink-0" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {mode === "mock" && (
        <p className="mt-2 rounded-md bg-risk-medium px-2.5 py-1.5 text-[0.6875rem] leading-snug text-risk-medium-foreground">
          Showing pre-computed fixture data.
        </p>
      )}
    </div>
  );
}
