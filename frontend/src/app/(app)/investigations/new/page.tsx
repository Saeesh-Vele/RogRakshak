"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Play } from "lucide-react";
import { toast } from "sonner";

import { getProvider } from "@/lib/data-provider";
import { describeError } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { caseIdFor, loadPatients, patientsFromCases } from "@/lib/patients";
import type { PatientListItem } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/investigation/status-badge";
import { PatientPicker, cultureLine } from "@/components/investigation/patient-picker";
import { AgentProgress, WORKFLOW_STEPS, type ProgressState } from "@/components/investigation/agent-progress";

/** Display pacing for the staged indicator only; nothing here is measured. */
const STEP_INTERVAL_MS = 600;

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-ui font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-meta text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-meta font-medium text-destructive">
          <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

const describe = (id: string, hint: boolean, error: boolean) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

export default function NewInvestigationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useAppStore((s) => s.mode);
  const { cases, status: casesStatus, load: loadCases, upsert } = useCasesStore();

  // Patient directory
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);
  const [dirError, setDirError] = useState<string | null>(null);
  const [dirStartedAt, setDirStartedAt] = useState<number | null>(null);

  const fetchDirectory = useCallback(
    (force = false) => {
      setDirError(null);
      if (mode === "mock") {
        setPatients(patientsFromCases(useCasesStore.getState().cases));
        return;
      }
      setPatients(null);
      setDirStartedAt(Date.now());
      loadPatients(force)
        .then(setPatients)
        .catch((err) => setDirError(describeError(err)))
        .finally(() => setDirStartedAt(null));
    },
    [mode]
  );

  useEffect(() => {
    void loadCases();
  }, [loadCases, mode]);
  useEffect(() => {
    // Mock mode lists the people in the fixture case, so wait for it
    if (mode === "mock" && casesStatus !== "ready") return;
    fetchDirectory();
  }, [fetchDirectory, mode, casesStatus]);

  // Form state
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const [organism, setOrganism] = useState("");
  const [resistance, setResistance] = useState("");
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const [useMockGraph, setUseMockGraph] = useState(false);
  const [errors, setErrors] = useState<{ patient?: string; organism?: string; submit?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const choose = useCallback((p: PatientListItem) => {
    setPatient(p);
    setErrors((e) => ({ ...e, patient: undefined }));
    if (p.latest_culture) {
      setOrganism(p.latest_culture.organism);
      setResistance(p.latest_culture.resistance_profile ?? "");
      setPrefilledFrom(`${p.name}'s latest culture`);
    } else {
      setPrefilledFrom(null);
    }
  }, []);

  // ?patient= from the search palette preselects
  const requested = searchParams.get("patient");
  useEffect(() => {
    if (!patients || patient || !requested) return;
    const p = patients.find((x) => String(x.id) === requested);
    if (p) choose(p);
  }, [patients, requested, patient, choose]);

  const caseIds = useMemo(() => new Set(cases.map((c) => c.case_id)), [cases]);
  const targetCaseId = patient ? caseIdFor(patient.id) : null;
  const existing = targetCaseId ? cases.find((c) => c.case_id === targetCaseId) ?? null : null;

  // Staged indicator
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const running = progress === "running";

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setElapsed(Date.now() - startedAt.current), 100);
    // Hold on the final step until the real response arrives
    const advance = setInterval(
      () => setActiveStep((s) => (s >= WORKFLOW_STEPS.length - 1 ? s : s + 1)),
      STEP_INTERVAL_MS
    );
    return () => {
      clearInterval(tick);
      clearInterval(advance);
    };
  }, [running]);

  function validate() {
    const next: typeof errors = {};
    if (!patient) next.patient = "Choose an index patient.";
    if (!organism.trim()) next.organism = "Enter the organism to investigate.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (existing) setConfirming(true);
    else void run();
  }

  async function run() {
    if (!patient) return;
    setErrors({});
    startedAt.current = Date.now();
    setElapsed(0);
    setActiveStep(0);
    setProgress("running");
    try {
      const result = await getProvider().create({
        target_patient_id: patient.id,
        organism: organism.trim(),
        resistance_profile: resistance.trim() || null,
        use_mock_graph: useMockGraph,
      });
      setElapsed(Date.now() - startedAt.current);
      setProgress("done");
      upsert(result);
      toast.success(`${result.case_id} ${existing ? "replaced" : "created"}`, {
        description: `${Math.round(result.confidence * 100)}% confidence · opening the case`,
      });
      setTimeout(() => router.push(`/investigations/${result.case_id}`), 600);
    } catch (err) {
      setElapsed(Date.now() - startedAt.current);
      setProgress("error");
      setErrors({ submit: describeError(err) });
      toast.error("Investigation failed", { description: describeError(err) });
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-5 md:p-8">
      <PageHeader
        eyebrow="Investigate"
        title="New investigation"
        description="Choose an index patient; the workflow builds the cohort, evidence, chains and score."
      />

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <form onSubmit={onSubmit} noValidate className="space-y-6 lg:col-span-7" aria-describedby={errors.submit ? "submit-error" : undefined}>
          {/* Patient */}
          {patients === null && !dirError ? (
            <div className="space-y-1.5">
              <p className="text-ui font-medium text-foreground">Index patient</p>
              <LoadingState startedAt={dirStartedAt} what="the patient directory" skeleton={<Skeleton className="h-10 w-full rounded-md" />} />
            </div>
          ) : dirError ? (
            <div className="space-y-1.5">
              <p className="text-ui font-medium text-foreground">Index patient</p>
              <ErrorState title="Couldn't load the patient directory" message={dirError} onRetry={() => fetchDirectory(true)} />
            </div>
          ) : (
            <FieldShell
              id="patient"
              label="Index patient"
              hint={`${patients!.length} patients on record; those with a culture are listed first.`}
              error={errors.patient}
            >
              <PatientPicker
                id="patient"
                patients={patients!}
                value={patient}
                onChange={choose}
                caseIds={caseIds}
                disabled={running}
                invalid={Boolean(errors.patient)}
                describedBy={describe("patient", true, Boolean(errors.patient))}
              />
            </FieldShell>
          )}

          {patient && (
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 border-y border-border py-3 text-ui">
              <dt className="label-caps pt-0.5">MRN</dt>
              <dd className="font-mono text-meta text-foreground">{patient.mrn}</dd>
              <dt className="label-caps pt-0.5">Latest culture</dt>
              <dd className="text-foreground">{cultureLine(patient)}</dd>
              <dt className="label-caps pt-0.5">Case ID</dt>
              <dd className="font-mono text-meta text-foreground">{targetCaseId}</dd>
            </dl>
          )}

          {/* Overwrite warning: case IDs derive from the patient */}
          {existing && (
            <div role="note" className="flex gap-3 border-l-2 border-foreground bg-card py-3 pl-4 pr-3">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div className="text-ui">
                <p className="font-medium text-foreground">
                  {existing.case_id} already exists and will be replaced.
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                  <StatusBadge status={existing.status} />
                  <span>{Math.round(existing.confidence * 100)}% confidence · {existing.evidence.length} evidence items. The current results are not kept.</span>
                </p>
                <Link href={`/investigations/${existing.case_id}`} className="mt-1.5 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Open {existing.case_id}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <FieldShell
              id="organism"
              label="Organism"
              hint={prefilledFrom ? `Filled from ${prefilledFrom}; edit if needed.` : undefined}
              error={errors.organism}
            >
              <Input
                id="organism"
                value={organism}
                onChange={(e) => {
                  setOrganism(e.target.value);
                  setErrors((x) => ({ ...x, organism: undefined }));
                }}
                placeholder="e.g. Klebsiella pneumoniae"
                disabled={running}
                aria-invalid={Boolean(errors.organism) || undefined}
                aria-describedby={describe("organism", Boolean(prefilledFrom), Boolean(errors.organism))}
                className="italic placeholder:not-italic"
              />
            </FieldShell>
            <FieldShell id="resistance" label="Resistance profile" hint="Optional, e.g. MDR.">
              <Input
                id="resistance"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                placeholder="MDR"
                disabled={running}
                aria-describedby="resistance-hint"
              />
            </FieldShell>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-ui">
            <input
              type="checkbox"
              checked={useMockGraph}
              onChange={(e) => setUseMockGraph(e.target.checked)}
              disabled={running}
              className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span>
              <span className="block text-foreground">Use the offline mock graph</span>
              <span className="block text-meta text-muted-foreground">
                Runs against fixtures instead of the live graph. For development.
              </span>
            </span>
          </label>

          {errors.submit && (
            <p id="submit-error" role="alert" className="flex items-start gap-2 border-l-2 border-destructive py-1 pl-3 text-ui text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {errors.submit}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <Button type="submit" size="lg" disabled={running}>
              <Play />
              {running ? "Running…" : existing ? `Run and replace ${existing.case_id}` : "Run investigation"}
            </Button>
            {mode === "mock" && (
              <p className="text-meta text-muted-foreground">
                Fixture mode: the result is the pre-computed sample case, whatever you choose.
              </p>
            )}
          </div>
        </form>

        <aside aria-label="Workflow progress" className="lg:col-span-5">
          <div className="rounded-lg border border-border bg-card p-5 lg:sticky lg:top-20">
            <AgentProgress activeStep={activeStep} state={progress} elapsedMs={elapsed} />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title={existing ? `Replace ${existing.case_id}?` : "Replace case?"}
        description={
          existing ? (
            <>
              A run for {patient?.name} writes to <span className="font-mono text-foreground">{existing.case_id}</span>,
              which already holds a {Math.round(existing.confidence * 100)}% result. Evidence, contacts, chains and
              scoring will be rebuilt and the current results are not kept.
            </>
          ) : null
        }
        confirmLabel="Run and replace"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void run();
        }}
      />
    </div>
  );
}
