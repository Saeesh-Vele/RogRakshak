"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Database, FlaskConical } from "lucide-react";

/**
 * Preserves the existing mock/live data-source switch (zustand `mode`).
 * Restyled as a small segmented control to sit quietly at the sidebar foot.
 */
export function ModeToggle() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="shrink-0 border-t border-border p-3">
      <p className="px-1 pb-2 text-eyebrow font-semibold uppercase text-muted-foreground">
        Data source
      </p>
      <div
        role="radiogroup"
        aria-label="Data source"
        className="flex gap-1 rounded-lg bg-muted p-1"
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
                active
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
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
