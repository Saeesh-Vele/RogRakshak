"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Loading, cold-start, error and empty states, shared by every data view so a
 * slow or failed request always looks and reads the same way.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block animate-pulse rounded-sm bg-sunken", className)}
    />
  );
}

/** After this long, a request is treated as a cold start and says so. */
export const COLD_START_AFTER_MS = 4000;
/** The honest upper bound we tell people to expect. */
const COLD_START_BUDGET_MS = 60_000;

/** Milliseconds since `startedAt`, ticking once a second; 0 when idle. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}

/**
 * Shows `skeleton` while a request is young. Past a few seconds it explains
 * the wait instead: the analysis service may be waking up, which can take up
 * to a minute, with the elapsed time against that minute.
 */
export function LoadingState({
  startedAt,
  skeleton,
  what = "investigations",
}: {
  startedAt: number | null;
  skeleton: React.ReactNode;
  /** Noun for the status line, e.g. "investigations", "this case". */
  what?: string;
}) {
  const elapsed = useElapsed(startedAt);
  const cold = elapsed >= COLD_START_AFTER_MS;
  const seconds = Math.floor(elapsed / 1000);
  const pct = Math.min(100, (elapsed / COLD_START_BUDGET_MS) * 100);

  return (
    <div aria-busy="true">
      {/* Polite live region: announced once when it changes to a cold start */}
      <p role="status" className="sr-only">
        {cold
          ? "Waking up the analysis service. This can take up to a minute."
          : `Loading ${what}.`}
      </p>
      {cold ? (
        <div className="border-b border-border pb-6 pt-2">
          <p className="font-display text-title-sm text-foreground">
            Waking up the analysis service
          </p>
          <p className="mt-1.5 max-w-xl text-copy text-muted-foreground">
            The backend sleeps when idle and has to start up and rebuild the
            contact graph before it can answer. This can take up to a minute;
            the page will fill in on its own.
          </p>
          <div className="mt-5 flex max-w-md items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-meta text-muted-foreground">
              {seconds}s
              {seconds >= 60 ? " — still working" : " / ~60s"}
            </span>
          </div>
        </div>
      ) : (
        skeleton
      )}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  retrying,
  className,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("border-b border-border pb-6 pt-2", className)}
    >
      <p className="font-display text-title-sm text-foreground">{title}</p>
      <p className="mt-1.5 max-w-xl text-copy text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={onRetry}
          disabled={retrying}
        >
          <RotateCw className={retrying ? "animate-spin" : undefined} />
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-10 text-center", className)}>
      <p className="font-display text-title-sm text-foreground">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-sm text-copy text-muted-foreground">
          {body}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
