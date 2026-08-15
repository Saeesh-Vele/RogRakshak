"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase } from "@/types/api";
import { useAppStore } from "@/lib/store";
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
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>(
    {}
  );
  const [focusedEvidence, setFocusedEvidence] = useState<{
    id: string;
    nonce: number;
  } | null>(null);

  const mode = useAppStore((s) => s.mode);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProvider().get(caseId);
      if (result) setInvestigation(result);
      else setError(`Investigation case '${caseId}' not found.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load, mode]);

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
    setError(null);
    try {
      const updated = await getProvider().create({
        target_patient_id: investigation.index_patient.id,
        organism: investigation.organism,
        resistance_profile: investigation.resistance_profile ?? null,
        use_mock_graph: false,
      });
      setInvestigation(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setRerunning(false);
    }
  }, [investigation]);

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
        <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading investigation…
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-6 lg:p-8">
        <Link
          href="/investigations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Investigations
        </Link>
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high-foreground" />
            <div>
              <p className="font-semibold text-foreground">
                {error || "Investigation not found"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The case may not exist, or the backend may be unavailable.
              </p>
            </div>
          </CardContent>
        </Card>
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
