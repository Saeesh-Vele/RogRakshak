"use client";

import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The seven LangGraph nodes, in the order they are wired in
 * backend/app/services/detection/langgraph_workflow.py (lines 279-294).
 */
export const WORKFLOW_STEPS = [
  { node: "load_context", label: "Loading patient context" },
  { node: "get_cohort", label: "Retrieving organism cohort" },
  { node: "aggregate_evidence", label: "Aggregating contact evidence" },
  { node: "score_evidence", label: "Scoring evidence" },
  { node: "build_chains", label: "Building transmission chains" },
  { node: "synthesize_summary", label: "Synthesising summary" },
  { node: "validate_output", label: "Validating output" },
] as const;

export type ProgressState = "idle" | "running" | "done" | "error";

interface AgentProgressProps {
  /** Index of the step currently in flight; steps before it are complete. */
  activeStep: number;
  state: ProgressState;
  elapsedMs: number;
}

export function AgentProgress({
  activeStep,
  state,
  elapsedMs,
}: AgentProgressProps) {
  const completedCount =
    state === "done" ? WORKFLOW_STEPS.length : Math.max(0, activeStep);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Agent Activity
        </h2>
        <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
          {(elapsedMs / 1000).toFixed(1)}s elapsed
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {completedCount} of {WORKFLOW_STEPS.length} steps
      </p>

      <ol className="mt-4">
        {WORKFLOW_STEPS.map((step, i) => {
          const complete = state === "done" || i < activeStep;
          const active = state === "running" && i === activeStep;
          const failed = state === "error" && i === activeStep;
          const isLast = i === WORKFLOW_STEPS.length - 1;

          return (
            <li key={step.node} className="flex gap-3">
              <div className="relative flex w-5 flex-none justify-center">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-6 h-full w-px bg-border"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full ring-4 ring-card",
                    complete && "bg-success",
                    active && "bg-primary-soft",
                    failed && "bg-risk-high",
                    !complete && !active && !failed && "bg-muted"
                  )}
                >
                  {complete && <Check className="h-3 w-3 text-white" />}
                  {active && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  )}
                  {failed && (
                    <X className="h-3 w-3 text-risk-high-foreground" />
                  )}
                </span>
              </div>

              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-4")}>
                <p
                  className={cn(
                    "text-[0.9375rem] font-medium leading-5",
                    complete && "text-foreground",
                    active && "text-primary",
                    failed && "text-risk-high-foreground",
                    !complete && !active && !failed && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 font-mono text-[0.75rem] text-muted-foreground/70">
                  {step.node}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-border pt-3 text-[0.8125rem] italic leading-snug text-muted-foreground">
        Step progress is indicative only. The backend runs this graph as one
        synchronous call and does not report per-step status, so the checklist
        is paced on the client — the elapsed time is real, the individual step
        timings are not measured.
      </p>
    </div>
  );
}
