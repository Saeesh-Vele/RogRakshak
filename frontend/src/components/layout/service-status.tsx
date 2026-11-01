"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { COLD_START_AFTER_MS, useElapsed } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/**
 * Analysis-service status at the foot of the sidebar.
 *
 * Mounting it is also the app's warm-up call: it starts loading the case list
 * as soon as any signed-in page renders. On a sleeping backend that request is
 * what wakes it, and because the list is shared (lib/cases-store.ts) the page
 * underneath reuses the same request instead of starting a second one.
 */
export function ServiceStatus() {
  const mode = useAppStore((s) => s.mode);
  const { status, cases, startedAt, load } = useCasesStore();
  const elapsed = useElapsed(status === "loading" ? startedAt : null);

  useEffect(() => {
    void load();
  }, [load]);

  let dot = "bg-muted-foreground/50 animate-pulse";
  let label = "Connecting";
  let detail: React.ReactNode = null;

  if (mode === "mock") {
    dot = "border border-muted-foreground bg-transparent";
    label = "Fixture data";
    detail = "Offline sample, not the live service";
  } else if (status === "ready") {
    dot = "bg-success";
    label = "Analysis service";
    detail = `Connected · ${cases.length} case${cases.length === 1 ? "" : "s"}`;
  } else if (status === "error") {
    dot = "bg-destructive";
    label = "Service unreachable";
    detail = (
      <button
        type="button"
        onClick={() => void load({ force: true })}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        Retry
      </button>
    );
  } else if (status === "loading" && elapsed >= COLD_START_AFTER_MS) {
    label = "Waking up";
    detail = `${Math.floor(elapsed / 1000)}s · can take up to a minute`;
  }

  return (
    <div className="shrink-0 border-t border-border px-5 py-4">
      {/* Only the label is live — the ticking seconds below would be noise */}
      <p
        role="status"
        className="flex items-center gap-2 text-meta font-medium text-foreground"
      >
        <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
        {label}
      </p>
      {detail && (
        <p className="mt-0.5 pl-3.5 text-meta text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
