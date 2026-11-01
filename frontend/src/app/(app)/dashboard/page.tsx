"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { deriveSummary, deriveTrend, deriveWardRisk } from "@/lib/metrics";
import type { InvestigationStatus } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { StatRow } from "@/components/dashboard/stat-row";
import { EpiCurve } from "@/components/dashboard/epi-curve";
import { WardStrip } from "@/components/dashboard/ward-strip";
import { MiniChainGraph } from "@/components/dashboard/mini-chain-graph";
import { CaseRows } from "@/components/dashboard/case-rows";
import { cn } from "@/lib/utils";

const STATUS_WORD: Record<InvestigationStatus, string> = {
  HIGH_PRIORITY_INVESTIGATION: "high priority",
  SUSPECTED_CLUSTER: "suspected cluster",
  POTENTIAL_CONTACT: "potential contact",
  NO_SIGNAL: "no signal",
};

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 border-y border-border py-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-11 w-14" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-56 rounded-lg lg:col-span-7" />
        <Skeleton className="h-56 rounded-lg lg:col-span-5" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const mode = useAppStore((s) => s.mode);
  const { cases, status, error, startedAt, load } = useCasesStore();
  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    void load();
  }, [load, mode]);

  const sorted = useMemo(
    () => [...cases].sort((a, b) => b.confidence - a.confidence),
    [cases]
  );
  const summary = useMemo(() => deriveSummary(cases), [cases]);
  const trend = useMemo(() => deriveTrend(cases), [cases]);
  const wards = useMemo(() => deriveWardRisk(cases), [cases]);

  // Which case the mini graph shows; defaults to the highest-confidence case
  const [graphCaseId, setGraphCaseId] = useState<string | null>(null);
  const graphCase = sorted.find((c) => c.case_id === graphCaseId) ?? sorted[0];

  const statusLine = (Object.entries(summary.byStatus) as [InvestigationStatus, number][])
    .map(([s, n]) => `${n} ${STATUS_WORD[s]}`)
    .join(" · ");

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-5 md:p-8">
      <PageHeader
        eyebrow="Surveillance"
        title="Dashboard"
        description={
          status === "ready"
            ? `Derived from ${cases.length} investigation${cases.length === 1 ? "" : "s"} · ${
                mode === "mock" ? "fixture data" : "live service"
              }`
            : status === "error"
              ? "Figures are unavailable while the analysis service is unreachable."
              : "Loading investigations…"
        }
        actions={
          <Link href="/investigations/new" className={buttonVariants()}>
            <Plus />
            New investigation
          </Link>
        }
      />

      {loading && <LoadingState startedAt={startedAt} skeleton={<DashboardSkeleton />} />}

      {status === "error" && (
        <ErrorState
          title="Couldn't load the dashboard"
          message={error ?? "The analysis service did not return the case list."}
          onRetry={() => void load({ force: true })}
        />
      )}

      {status === "ready" && cases.length === 0 && (
        <EmptyState
          className="rounded-lg border border-border bg-card"
          title="No investigations yet"
          body="The dashboard is derived entirely from investigations. Run one against an index patient to populate it."
          action={
            <Link href="/investigations/new" className={buttonVariants()}>
              <Plus />
              Start an investigation
            </Link>
          }
        />
      )}

      {status === "ready" && cases.length > 0 && (
        <>
          <StatRow
            stats={[
              { label: "Investigations", value: summary.caseCount, sub: statusLine },
              {
                label: "Positive cultures",
                value: summary.positivePatients,
                sub:
                  summary.firstPositive && summary.lastPositive
                    ? `Patients, ${fmtDay(summary.firstPositive)}–${fmtDay(summary.lastPositive)}`
                    : "No culture dates recorded",
              },
              {
                label: "Linked at high tier",
                value: summary.highTierPatients,
                sub: `of ${summary.patientsInvolved} patients involved`,
                risk: summary.highTierPatients > 0,
              },
              {
                label: "Wards implicated",
                value: summary.wardCount,
                sub: wards[0] ? `Most evidence: ${wards[0].name}` : "None recorded",
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <Panel className="lg:col-span-7">
              <PanelHeader
                title="Investigations"
                meta={`${cases.length} case${cases.length === 1 ? "" : "s"}`}
                actions={
                  <Link
                    href="/investigations"
                    className="rounded-sm text-ui font-medium text-primary hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              <CaseRows cases={sorted} />
            </Panel>

            {graphCase && (
              <Panel className="flex flex-col lg:col-span-5">
                <PanelHeader
                  title="Transmission"
                  meta={graphCase.case_id}
                  actions={
                    sorted.length > 1 ? (
                      <div role="group" aria-label="Case shown" className="flex gap-1">
                        {sorted.map((c) => (
                          <button
                            key={c.case_id}
                            type="button"
                            aria-pressed={c.case_id === graphCase.case_id}
                            onClick={() => setGraphCaseId(c.case_id)}
                            className={cn(
                              "h-7 rounded-sm px-2 font-mono text-[0.6875rem] transition-colors max-sm:h-11",
                              c.case_id === graphCase.case_id
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-sunken hover:text-foreground"
                            )}
                          >
                            {c.case_id.replace("CASE-2026-", "")}
                          </button>
                        ))}
                      </div>
                    ) : undefined
                  }
                />
                <div className="flex-1 px-4 pt-3">
                  <MiniChainGraph investigation={graphCase} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-5 py-3">
                  <span className="text-meta text-muted-foreground">
                    {graphCase.transmission_chains.length} chain
                    {graphCase.transmission_chains.length === 1 ? "" : "s"} · edge labels are
                    recorded overlap
                  </span>
                  <Link
                    href={`/graph?case=${encodeURIComponent(graphCase.case_id)}`}
                    className="inline-flex items-center gap-1 rounded-sm text-ui font-medium text-primary hover:underline"
                  >
                    Open graph
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Panel>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <Panel className="lg:col-span-7">
              <PanelHeader
                title="Positive cultures by day"
                description="From recorded culture dates; each patient counted once."
              />
              <EpiCurve points={trend} />
            </Panel>
            <Panel className="lg:col-span-5">
              <PanelHeader
                title="Contact evidence by ward"
                description="Located contact items per ward, by tier."
              />
              <WardStrip wards={wards} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
