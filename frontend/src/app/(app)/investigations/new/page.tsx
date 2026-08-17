"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProvider } from "@/lib/data-provider";
import type { CreateInvestigationRequest } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AgentProgress,
  WORKFLOW_STEPS,
  type ProgressState,
} from "@/components/investigation/agent-progress";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Pacing for the client-side checklist. The graph is invoked synchronously, so
 * these are display timings only — the run never reports "complete" until the
 * real response lands (see `holdAtLastStep`).
 */
const STEP_INTERVAL_MS = 600;

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[0.8125rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function NewInvestigationPage() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);

  const [patientId, setPatientId] = useState("1");
  const [organism, setOrganism] = useState("Klebsiella pneumoniae");
  const [resistance, setResistance] = useState("MDR");
  const [useMockGraph, setUseMockGraph] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressState>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  const running = progress === "running";

  // Advance the checklist and the elapsed clock while a request is in flight.
  useEffect(() => {
    if (!running) return;
    // Guard against the clock being read before a submit set the start time.
    if (!startedAt.current) startedAt.current = Date.now();

    const tick = setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 100);

    const advance = setInterval(() => {
      setActiveStep((s) =>
        // Hold on the final step until the real response arrives, so the UI
        // never shows the run as finished before the backend says so.
        s >= WORKFLOW_STEPS.length - 1 ? s : s + 1
      );
    }, STEP_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(advance);
    };
  }, [running]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pid = parseInt(patientId, 10);
    if (isNaN(pid) || pid < 1) {
      setError("Patient ID must be a positive integer.");
      return;
    }
    if (!organism.trim()) {
      setError("Organism is required.");
      return;
    }

    startedAt.current = Date.now();
    setElapsed(0);
    setActiveStep(0);
    setProgress("running");

    try {
      const request: CreateInvestigationRequest = {
        target_patient_id: pid,
        organism: organism.trim(),
        resistance_profile: resistance.trim() || null,
        use_mock_graph: useMockGraph,
      };
      const result = await getProvider().create(request);
      setElapsed(Date.now() - startedAt.current);
      setProgress("done");
      // Brief beat so the completed checklist is visible before navigating
      setTimeout(() => router.push(`/investigations/${result.case_id}`), 550);
    } catch (err: unknown) {
      setElapsed(Date.now() - startedAt.current);
      setProgress("error");
      setError(err instanceof Error ? err.message : "Investigation failed");
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Investigate"
        title="New investigation"
        description="Point the LangGraph workflow at an index patient and organism."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Investigation Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                id="patientId"
                label="Target Patient ID"
                hint="The index patient to investigate."
              >
                <Input
                  id="patientId"
                  type="number"
                  min={1}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. 1"
                  disabled={running}
                  required
                />
              </Field>

              <Field id="organism" label="Organism">
                <Input
                  id="organism"
                  value={organism}
                  onChange={(e) => setOrganism(e.target.value)}
                  placeholder="e.g. Klebsiella pneumoniae"
                  disabled={running}
                  required
                />
              </Field>

              <Field
                id="resistance"
                label="Resistance Profile"
                hint="Optional — e.g. MDR, XDR."
              >
                <Input
                  id="resistance"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  placeholder="e.g. MDR"
                  disabled={running}
                />
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3.5">
                <input
                  id="useMockGraph"
                  type="checkbox"
                  checked={useMockGraph}
                  onChange={(e) => setUseMockGraph(e.target.checked)}
                  disabled={running}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/25"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Use offline mock graph
                  </span>
                  <span className="block text-[0.8125rem] text-muted-foreground">
                    Runs against fixtures instead of the live graph. Development
                    only.
                  </span>
                </span>
              </label>

              <div
                className="rounded-lg bg-muted p-3.5 text-[0.8125rem] leading-snug text-muted-foreground"
                role="note"
              >
                The case ID is derived from the target patient ID, so
                investigating a patient that already has a case will overwrite
                it.
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-risk-high p-3.5 text-sm text-risk-high-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={running}
                size="lg"
                className="w-full"
              >
                <PlusCircle />
                {running ? "Running Investigation…" : "Start Investigation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {progress === "idle" ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Agent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The LangGraph workflow runs seven nodes in sequence. Progress
                  appears here once you start an investigation.
                </p>
                <ol className="mt-3 space-y-1.5">
                  {WORKFLOW_STEPS.map((s) => (
                    <li
                      key={s.node}
                      className="font-mono text-[0.75rem] text-muted-foreground/70"
                    >
                      {s.node}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : (
            <AgentProgress
              activeStep={activeStep}
              state={progress}
              elapsedMs={elapsed}
            />
          )}

          {mode === "mock" && (
            <div className="rounded-lg bg-risk-medium p-3.5 text-[0.8125rem] leading-snug text-risk-medium-foreground">
              Mock mode is active — the result will come from pre-computed
              fixture data regardless of the parameters entered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
