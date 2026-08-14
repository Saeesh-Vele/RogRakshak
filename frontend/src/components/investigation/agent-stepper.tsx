"use client";

import {
  Check,
  Loader2,
  AlertCircle,
  FileCheck,
  CalendarDays,
  Users2,
  Network,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { AgentStageName, AgentStageState } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AgentStepperProps {
  agents: Record<AgentStageName, AgentStageState>;
  overallStatus: "idle" | "investigating" | "completed" | "failed";
}

const stageConfig: Record<
  AgentStageName,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  case: {
    label: "Case Agent",
    icon: FileCheck,
    description: "Verify microbiological culture records & resistance markers",
  },
  timeline: {
    label: "Timeline Agent",
    icon: CalendarDays,
    description: "Reconstruct ADT movements, ward stays, and procedure timestamps",
  },
  contact: {
    label: "Contact Agent",
    icon: Users2,
    description: "Compute temporal ward co-locations and staff crossover shifts",
  },
  graph: {
    label: "Graph Agent",
    icon: Network,
    description: "Construct multi-hop transmission network & intermediary paths",
  },
  risk: {
    label: "Risk Agent",
    icon: ShieldAlert,
    description: "Synthesize transmission probability & strain phenotypic concordance",
  },
  report: {
    label: "Report Agent",
    icon: FileText,
    description: "Generate structured clinical infection-control investigation report",
  },
};

const stageOrder: AgentStageName[] = ["case", "timeline", "contact", "graph", "risk", "report"];

export function AgentStepper({ agents, overallStatus }: AgentStepperProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Multi-Agent Investigation Pipeline</span>
            {overallStatus === "investigating" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                <Loader2 className="size-3 animate-spin" />
                Live Reasoning
              </span>
            )}
            {overallStatus === "completed" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="size-3" />
                All Stages Verified
              </span>
            )}
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous multi-agent LangGraph workflow execution stream
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {stageOrder.map((stageKey, index) => {
            const agent = agents[stageKey];
            const meta = stageConfig[stageKey];
            const isComplete = agent.status === "complete";
            const isRunning = agent.status === "running";
            const isError = agent.status === "error";
            const isPending = agent.status === "pending";

            return (
              <div key={stageKey} className="relative group">
                {/* Step indicator node on timeline */}
                <div
                  className={`absolute -left-6 top-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                    isComplete
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                      : isRunning
                      ? "bg-teal-600 text-white ring-4 ring-teal-100 animate-pulse"
                      : isError
                      ? "bg-rose-600 text-white ring-4 ring-rose-50"
                      : "bg-slate-100 text-slate-400 border border-slate-300"
                  }`}
                >
                  {isComplete && <Check className="size-3.5 stroke-[3]" />}
                  {isRunning && <Loader2 className="size-3.5 animate-spin" />}
                  {isError && <AlertCircle className="size-3.5" />}
                  {isPending && <span className="text-[10px]">{index + 1}</span>}
                </div>

                {/* Step Content */}
                <div className="pl-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isComplete
                            ? "text-slate-900"
                            : isRunning
                            ? "text-teal-700"
                            : "text-slate-500"
                        }`}
                      >
                        {meta.label}
                      </span>
                      {isRunning && (
                        <span className="text-[10px] font-semibold text-teal-600 animate-pulse">
                          Running...
                        </span>
                      )}
                    </div>
                    {isComplete && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Complete
                      </span>
                    )}
                  </div>

                  {/* Summary / Description */}
                  {isComplete && agent.summary ? (
                    <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {agent.summary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {meta.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
