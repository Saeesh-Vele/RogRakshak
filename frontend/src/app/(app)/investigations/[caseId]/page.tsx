"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Table2, Workflow } from "lucide-react";
import { toast } from "sonner";

import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase, PatientPlacement } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { describeError } from "@/lib/api-client";
import {
  fetchPatientTimelines,
  placementsFrom,
  wardStaysFromTimeline,
  type WardStay,
} from "@/lib/patient-placement";

import { CaseHeader } from "@/components/investigation/case-header";
import { ScoringBreakdownView } from "@/components/investigation/scoring-breakdown";
import { EvidenceList } from "@/components/investigation/evidence-list";
import { GraphLegend, TransmissionGraph } from "@/components/investigation/transmission-graph";
import { GraphTable } from "@/components/investigation/graph-table";
import { useGraphView } from "@/components/investigation/use-graph-view";
import { TimelineView } from "@/components/investigation/timeline-view";
import { DiscoveredContacts } from "@/components/investigation/discovered-contacts";
import { ReportCard } from "@/components/investigation/report-card";
import { SectionNav } from "@/components/layout/section-nav";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "timeline", label: "Timeline" },
  { id: "contacts", label: "Contacts" },
  { id: "graph", label: "Graph" },
  { id: "evidence", label: "Evidence" },
  { id: "scoring", label: "Scoring" },
  { id: "report", label: "Report" },
];

function Section({
  id,
  title,
  description,
  actions,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-32", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id={`${id}-title`} className="font-display text-title-sm text-foreground">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-ui text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function InvestigationDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [investigation, setInvestigation] = useState<InvestigationCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>({});
  const [stays, setStays] = useState<WardStay[] | undefined>(undefined);
  // Phones start on the table view; see use-graph-view.ts
  const { asTable, setAsTable, resolved: viewResolved } = useGraphView();
  const [focusedEvidence, setFocusedEvidence] = useState<{ ids: string[]; nonce: number } | null>(null);
  const graphRegionId = useId();

  const mode = useAppStore((s) => s.mode);
  const upsert = useCasesStore((s) => s.upsert);

  const load = useCallback(async () => {
    // Already in the shared list (e.g. arriving from the dashboard): no fetch.
    const cached = useCasesStore.getState().cases.find((c) => c.case_id === caseId);
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

  // Ward/bed placement and recorded ward stays live on
  // /graph/patient/{id}/timeline, not on the investigation payload. Loaded
  // separately so a failure degrades to a graph without placement lines and a
  // timeline without stay bars, never a broken page.
  useEffect(() => {
    if (!investigation || mode === "mock") return;
    let cancelled = false;
    const indexId = investigation.index_patient.id;
    fetchPatientTimelines([indexId, ...investigation.candidate_patients.map((p) => p.id)])
      .then((t) => {
        if (cancelled) return;
        setPlacements(placementsFrom(t));
        setStays(t[indexId] ? wardStaysFromTimeline(t[indexId]) : undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [investigation, mode]);

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

  // A graph edge click hands its evidence ids to the list, which opens them
  // and scrolls to the first. The nonce lets the same edge be clicked twice.
  const onSelectEvidence = useCallback((evidenceIds: string[]) => {
    setFocusedEvidence((prev) => ({ ids: evidenceIds, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] p-5 md:p-8">
        <LoadingState
          startedAt={startedAt}
          what="this case"
          skeleton={
            <div className="space-y-4">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-10 w-96 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
              <Skeleton className="mt-8 h-40 w-full rounded-lg" />
            </div>
          }
        />
      </div>
    );
  }

  if (error || notFound || !investigation) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-8">
        <Breadcrumbs items={[{ label: "Investigations", href: "/investigations" }, { label: caseId }]} />
        <h1 className="font-display text-title text-foreground">{caseId}</h1>
        {error ? (
          <ErrorState title={`Couldn't load ${caseId}`} message={error} onRetry={() => void load()} />
        ) : (
          <ErrorState
            title={`${caseId} was not found`}
            message="Investigations are held in memory by the backend, so cases other than the two demo cases (CASE-2026-001 and CASE-2026-004) disappear when it restarts. Run the investigation again to recreate it."
          />
        )}
        <Link href="/investigations" className="inline-flex items-center gap-1.5 text-ui font-medium text-primary hover:underline">
          Back to investigations
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const inv = investigation;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-5 md:px-8 md:pt-8">
      <CaseHeader investigation={inv} onRerun={onRerun} rerunning={rerunning} />

      {inv.warnings.length > 0 && (
        <div role="note" className="mt-5 border-l-2 border-node-downstream py-1 pl-4">
          {inv.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 text-ui text-risk-medium-foreground">
              <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Direct child of the page column, so it stays stuck for the whole page */}
      <SectionNav sections={SECTIONS} className="mt-2" />

      <div className="mt-8 space-y-14">
        <div className="grid gap-x-10 gap-y-14 xl:grid-cols-12">
          <Section
            id="timeline"
            title="Index patient's stay"
            description="On a real time axis; the culture is marked in red."
            className="xl:col-span-8"
          >
            <TimelineView entries={inv.timeline} stays={stays} />
          </Section>
          <Section
            id="contacts"
            title="Contacts, ranked"
            description="By tier, then total overlap with the index patient."
            className="xl:col-span-4"
          >
            <DiscoveredContacts investigation={inv} />
          </Section>
        </div>

        <Section
          id="graph"
          title="Transmission graph"
          description={`${inv.transmission_chains.length} evidence-supported pathway${inv.transmission_chains.length === 1 ? "" : "s"}${asTable ? "" : " · click an edge to open its evidence"}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                aria-pressed={asTable}
                aria-controls={graphRegionId}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-ui text-foreground transition-colors hover:border-input max-sm:h-11"
              >
                {asTable ? <Workflow aria-hidden className="h-4 w-4" /> : <Table2 aria-hidden className="h-4 w-4" />}
                {asTable ? "View as graph" : "View as table"}
              </button>
              <Link
                href={`/graph?case=${encodeURIComponent(inv.case_id)}`}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-ui font-medium text-primary hover:underline max-sm:h-11"
              >
                Graph explorer
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
        >
          <div id={graphRegionId}>
            {!viewResolved ? (
              <Skeleton className="h-[600px] w-full rounded-lg" />
            ) : asTable ? (
              <GraphTable investigation={inv} placements={placements} />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-card px-4 py-2.5">
                  <GraphLegend />
                </div>
                <TransmissionGraph
                  investigation={inv}
                  chains={inv.transmission_chains}
                  placements={placements}
                  onSelectEvidence={onSelectEvidence}
                />
              </div>
            )}
          </div>
        </Section>

        <Section
          id="evidence"
          title={`Evidence (${inv.evidence.length})`}
          description="Atomic, independently verifiable items, grouped by tier."
        >
          <EvidenceList items={inv.evidence} focused={focusedEvidence} />
        </Section>

        <div className="grid gap-x-10 gap-y-14 xl:grid-cols-12">
          <Section
            id="scoring"
            title="Scoring"
            description="Five fixed weights; the same evidence always gives the same number."
            className="xl:col-span-5"
          >
            <ScoringBreakdownView scoring={inv.scoring} />
          </Section>
          <Section id="report" title="Report" className="xl:col-span-7">
            <ReportCard investigation={inv} />
          </Section>
        </div>
      </div>
    </div>
  );
}
