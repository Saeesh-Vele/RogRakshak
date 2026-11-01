"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The seven LangGraph nodes, in the order they are wired in
 * backend/app/services/detection/langgraph_workflow.py (create_investigation_graph).
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
  /** Index of the step the staged indicator is showing; not measured progress. */
  activeStep: number;
  state: ProgressState;
  elapsedMs: number;
}

/**
 * A staged indicator, not a progress report. The backend runs the whole graph
 * as one synchronous request and reports nothing until it finishes, so the
 * steps advance on a timer and the panel says so before anything else. Only
 * two things here are real: the elapsed time and the final outcome. The last
 * step holds until the response actually arrives.
 */
export function AgentProgress({ activeStep, state, elapsedMs }: AgentProgressProps) {
  const seconds = (elapsedMs / 1000).toFixed(1);
  const status =
    state === "done"
      ? `Finished in ${seconds}s.`
      : state === "error"
        ? `Stopped after ${seconds}s: the request failed.`
        : state === "running"
          ? "Running. Waiting for the backend's single response."
          : "Not started.";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-title-sm text-foreground">Workflow</h2>
        <span className="font-mono text-meta text-foreground">
          {state === "idle" ? "—" : `${seconds}s elapsed`}
        </span>
      </div>

      <p className="mt-2 border-l-2 border-border pl-3 text-meta text-muted-foreground">
        Indicative only. The backend runs these seven steps as one request and does not report
        per-step progress, so the steps below advance on a timer. The elapsed time and the result
        are real; the step timings are not measured.
      </p>

      <p role="status" className="mt-3 text-ui font-medium text-foreground">
        {status}
      </p>

      <ol className="mt-3">
        {WORKFLOW_STEPS.map((step, i) => {
          const complete = state === "done" || (state !== "idle" && i < activeStep);
          const active = state === "running" && i === activeStep;
          const failed = state === "error" && i === activeStep;
          return (
            <li key={step.node} className="flex gap-3 border-t border-border py-2 first:border-t-0">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  complete && "border-foreground bg-foreground text-background",
                  active && "border-primary",
                  failed && "border-destructive bg-destructive text-white",
                  !complete && !active && !failed && "border-input"
                )}
              >
                {complete && <Check className="h-2.5 w-2.5" />}
                {failed && <X className="h-2.5 w-2.5" />}
                {active && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-ui",
                    active ? "font-medium text-foreground" : complete ? "text-foreground" : "text-muted-foreground",
                    failed && "text-destructive"
                  )}
                >
                  {step.label}
                  {active && <span className="text-muted-foreground"> (shown, not measured)</span>}
                </span>
                <span className="block font-mono text-[0.6875rem] text-muted-foreground">{step.node}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
