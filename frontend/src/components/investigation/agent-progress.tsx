"use client";

import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The seven LangGraph nodes, in order from the backend workflow.
 */
export const WORKFLOW_STEPS = [
  { node: "load_context",       label: "Loading patient context" },
  { node: "get_cohort",         label: "Retrieving organism cohort" },
  { node: "aggregate_evidence", label: "Aggregating contact evidence" },
  { node: "score_evidence",     label: "Scoring evidence" },
  { node: "build_chains",       label: "Building transmission chains" },
  { node: "synthesize_summary", label: "Synthesising summary" },
  { node: "validate_output",    label: "Validating output" },
] as const;

export type ProgressState = "idle" | "running" | "done" | "error";

interface AgentProgressProps {
  activeStep: number;
  state: ProgressState;
  elapsedMs: number;
}

export function AgentProgress({ activeStep, state, elapsedMs }: AgentProgressProps) {
  const completedCount =
    state === "done" ? WORKFLOW_STEPS.length : Math.max(0, activeStep);

  const overallPct = Math.round(
    (completedCount / WORKFLOW_STEPS.length) * 100
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[1.0625rem] font-semibold tracking-tight text-foreground">
            Agent Activity
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {completedCount} of {WORKFLOW_STEPS.length} steps complete
          </p>
        </div>
        <div className="text-right">
          <p className="text-[1.375rem] font-bold tabular-nums text-foreground">
            {overallPct}%
          </p>
          <p className="text-[0.75rem] text-muted-foreground tabular-nums">
            {(elapsedMs / 1000).toFixed(1)}s elapsed
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Step list */}
      <ol className="px-5 py-4">
        {WORKFLOW_STEPS.map((step, i) => {
          const complete = state === "done" || i < activeStep;
          const active   = state === "running" && i === activeStep;
          const failed   = state === "error" && i === activeStep;
          const pending  = !complete && !active && !failed;
          const isLast   = i === WORKFLOW_STEPS.length - 1;

          return (
            <li key={step.node} className="flex gap-3.5">
              {/* Rail + node */}
              <div className="relative flex w-6 flex-none justify-center">
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-6 h-full w-px",
                      complete ? "bg-success/40" : "bg-border"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-card transition-all duration-150",
                    complete && "bg-success",
                    active  && "bg-primary-soft ring-primary/20",
                    failed  && "bg-risk-high",
                    pending && "border-2 border-border bg-card"
                  )}
                >
                  {complete && <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
                  {active  && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {failed  && <X className="h-3.5 w-3.5 text-risk-high-foreground" strokeWidth={2.5} />}
                  {pending && <span className="h-2 w-2 rounded-full bg-border" />}
                </span>
              </div>

              {/* Label */}
              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-3.5")}>
                <p
                  className={cn(
                    "text-[0.9rem] font-medium leading-6",
                    complete && "text-foreground",
                    active  && "font-semibold text-primary",
                    failed  && "text-risk-high-foreground",
                    pending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                  {active && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[0.75rem] font-normal text-primary/70">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      Running…
                    </span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground/60">
                  {step.node}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-border px-5 pb-4 pt-3 text-[0.8125rem] italic leading-snug text-muted-foreground/70">
        Step indicators are indicative only. The backend runs this as a single
        synchronous call — elapsed time is real, individual step timings are not.
      </p>
    </div>
  );
}
