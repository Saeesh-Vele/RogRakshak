"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { describeError } from "@/lib/api-client";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CaseHeader } from "@/components/investigation/case-header";
import { ScoringBreakdownView } from "@/components/investigation/scoring-breakdown";
import { EvidenceList } from "@/components/investigation/evidence-list";
import { TransmissionGraph } from "@/components/investigation/transmission-graph";
import { TimelineView } from "@/components/investigation/timeline-view";
import { DiscoveredContacts } from "@/components/investigation/discovered-contacts";
import { ReportCard } from "@/components/investigation/report-card";
import { GraphLegend } from "@/components/investigation/transmission-graph";
import { evidenceTier } from "@/lib/risk";
import { fetchPatientPlacements } from "@/lib/patient-placement";
import type { PatientPlacement } from "@/types/api";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function InvestigationDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [investigation, setInvestigation] = useState<InvestigationCase | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>(
    {}
  );
  const [focusedEvidence, setFocusedEvidence] = useState<{
    id: string;
    nonce: number;
  } | null>(null);

  const mode = useAppStore((s) => s.mode);
  const upsert = useCasesStore((s) => s.upsert);

  const load = useCallback(async () => {
    // Already in the shared list (e.g. arriving from the dashboard): no fetch.
    const cached = useCasesStore
      .getState()
      .cases.find((c) => c.case_id === caseId);
    if (cached && useCasesStore.getState().loadedMode === mode) {
      setInvestigation(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setStartedAt(Date.now());
    setError(null);
    setNotFound(false);
    try {
      const result = await getProvider().get(caseId);
      if (result) setInvestigation(result);
      else setNotFound(true);
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setLoading(false);
      setStartedAt(null);
    }
  }, [caseId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ward/bed for the graph cards lives on /graph/patient/{id}/timeline, not on
  // the investigation payload. Loaded separately so a failure here degrades to
  // cards without a placement line rather than blocking the page.
  useEffect(() => {
    if (!investigation || mode === "mock") return;
    let cancelled = false;
    const ids = [
      investigation.index_patient.id,
      ...investigation.candidate_patients.map((p) => p.id),
    ];
    fetchPatientPlacements(ids)
      .then((p) => {
        if (!cancelled) setPlacements(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [investigation, mode]);

  /**
   * Re-runs the workflow for this case's index patient. The backend derives
   * case_id from the patient id, so this refreshes the same case in place —
   * it uses the existing POST endpoint, nothing new.
   */
  const onRerun = useCallback(async () => {
    if (!investigation) return;
    setRerunning(true);
    const pending = toast.loading(`Re-running ${investigation.case_id}…`, {
      description: "The workflow rebuilds evidence, chains and scoring.",
    });
    try {
      const updated = await getProvider().create({
        target_patient_id: investigation.index_patient.id,
        organism: investigation.organism,
        resistance_profile: investigation.resistance_profile ?? null,
        use_mock_graph: false,
      });
      setInvestigation(updated);
      upsert(updated);
      toast.success(`${updated.case_id} updated`, {
        id: pending,
        description: `${Math.round(updated.confidence * 100)}% confidence · ${updated.evidence.length} evidence items`,
      });
    } catch (err: unknown) {
      toast.error("Re-run failed", {
        id: pending,
        description: `${describeError(err)} The previous results are unchanged.`,
      });
    } finally {
      setRerunning(false);
    }
  }, [investigation, upsert]);

  // Evidence rows are collapsed by default, so a graph edge click hands the id
  // to the list rather than driving the DOM itself. The nonce lets the same
  // edge be clicked twice and still re-trigger the scroll + highlight.
  const onSelectEvidence = useCallback((evidenceId: string) => {
    setFocusedEvidence((prev) => ({
      id: evidenceId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
        <LoadingState
          startedAt={startedAt}
          what="this case"
          skeleton={
            <div className="space-y-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-9 w-80" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="mt-6 h-64 w-full rounded-lg" />
            </div>
          }
        />
      </div>
    );
  }

  if (error || notFound || !investigation) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-6 lg:p-8">
        <Link
          href="/investigations"
          className="inline-flex items-center gap-1.5 text-ui text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to investigations
        </Link>
        {error ? (
          <ErrorState
            title={`Couldn't load ${caseId}`}
            message={error}
            onRetry={() => void load()}
          />
        ) : (
          <ErrorState
            title={`${caseId} was not found`}
            message="Investigations are held in memory by the backend, so cases other than CASE-2026-001 disappear when it restarts. Run the investigation again to recreate it."
          />
        )}
      </div>
    );
  }

  const inv = investigation;

  const TIER_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const sortedEvidence = [...inv.evidence].sort(
    (a, b) =>
      TIER_RANK[evidenceTier(a)] - TIER_RANK[evidenceTier(b)] ||
      b.strength - a.strength
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <CaseHeader investigation={inv} onRerun={onRerun} rerunning={rerunning} />

      {inv.warnings.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 p-4">
            {inv.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-risk-medium-foreground"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline + ranked contacts — proportional so neither column leaves a
          dead band of whitespace on a wide screen */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <TimelineView entries={inv.timeline} />
        <DiscoveredContacts investigation={inv} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Transmission Graph</CardTitle>
              <p className="text-sm text-muted-foreground">
                {inv.transmission_chains.length} evidence-supported pathway
                {inv.transmission_chains.length !== 1 ? "s" : ""} · click an edge
                to jump to its evidence
              </p>
            </div>
            <Link
              href={`/graph?case=${encodeURIComponent(inv.case_id)}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open in Graph Explorer →
            </Link>
          </div>
          <GraphLegend />
        </CardHeader>
        <div className="border-t border-border">
          <TransmissionGraph
            investigation={inv}
            chains={inv.transmission_chains}
            placements={placements}
            onSelectEvidence={onSelectEvidence}
          />
        </div>
      </Card>

      {/* Evidence, strongest tier first */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Evidence ({inv.evidence.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each item is an atomic, independently verifiable observation.
          </p>
        </CardHeader>
        <EvidenceList items={sortedEvidence} focused={focusedEvidence} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ReportCard investigation={inv} />
        <ScoringBreakdownView scoring={inv.scoring} />
      </div>
    </div>
  );
}
