"use client";

import { Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Table2, Workflow } from "lucide-react";

import { fetchPatientPlacements } from "@/lib/patient-placement";
import type { PatientPlacement } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/investigation/status-badge";
import { GraphLegend, TransmissionGraph } from "@/components/investigation/transmission-graph";
import { GraphTable } from "@/components/investigation/graph-table";
import { useGraphView } from "@/components/investigation/use-graph-view";

function GraphExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useAppStore((s) => s.mode);
  const { cases, status, error, startedAt, load } = useCasesStore();
  const loading = status === "idle" || status === "loading";
  const [selectedId, setSelectedId] = useState("");
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>({});
  // Phones start on the table view; see use-graph-view.ts
  const { asTable, setAsTable, resolved: viewResolved } = useGraphView();
  const regionId = useId();

  useEffect(() => {
    void load();
  }, [load, mode]);

  // Pick the ?case= one if present, else the strongest case
  useEffect(() => {
    if (status !== "ready") return;
    setSelectedId((current) => {
      if (current && cases.some((c) => c.case_id === current)) return current;
      const requested = searchParams.get("case");
      const strongest = [...cases].sort((a, b) => b.confidence - a.confidence)[0];
      return cases.find((c) => c.case_id === requested)?.case_id ?? strongest?.case_id ?? "";
    });
  }, [status, cases, searchParams]);

  const selected = useMemo(() => cases.find((c) => c.case_id === selectedId) ?? null, [cases, selectedId]);

  useEffect(() => {
    if (!selected || mode === "mock") return;
    let cancelled = false;
    fetchPatientPlacements([selected.index_patient.id, ...selected.candidate_patients.map((p) => p.id)])
      .then((p) => !cancelled && setPlacements(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected, mode]);

  const onSelect = useCallback(
    (caseId: string) => {
      setSelectedId(caseId);
      setPlacements({});
      router.replace(`/graph?case=${encodeURIComponent(caseId)}`, { scroll: false });
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-5 md:p-8">
      <PageHeader
        eyebrow="Graph explorer"
        title="Temporal contact network"
        description="Staff-mediated and direct contact pathways for one case at a time."
      />

      {loading && (
        <LoadingState startedAt={startedAt} skeleton={<Skeleton className="h-[520px] w-full rounded-lg" />} />
      )}

      {status === "error" && (
        <ErrorState
          title="Couldn't load investigations"
          message={error ?? "The analysis service did not return the case list."}
          onRetry={() => void load({ force: true })}
        />
      )}

      {status === "ready" && !selected && (
        <EmptyState
          className="rounded-lg border border-border bg-card"
          title="No investigations yet"
          body="The graph draws a case's contact network. Run an investigation to create one."
          action={
            <Link href="/investigations/new" className={buttonVariants()}>
              Start an investigation
            </Link>
          }
        />
      )}

      {status === "ready" && selected && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-[300px]">
                <label htmlFor="case-picker" className="label-caps mb-1.5 block">
                  Case
                </label>
                <Select id="case-picker" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id} · {c.index_patient.name}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 text-ui text-muted-foreground">
                <StatusBadge status={selected.status} />
                <span className="font-mono text-meta text-foreground">{Math.round(selected.confidence * 100)}%</span>
                <span>
                  {selected.transmission_chains.length} chain{selected.transmission_chains.length === 1 ? "" : "s"} ·{" "}
                  <span className="italic">{selected.organism}</span> {selected.resistance_profile}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                aria-pressed={asTable}
                aria-controls={regionId}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-ui text-foreground transition-colors hover:border-input max-sm:h-11"
              >
                {asTable ? <Workflow aria-hidden className="h-4 w-4" /> : <Table2 aria-hidden className="h-4 w-4" />}
                {asTable ? "View as graph" : "View as table"}
              </button>
              <Link
                href={`/investigations/${selected.case_id}`}
                className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-ui font-medium text-primary hover:underline max-sm:h-11"
              >
                Full investigation
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div id={regionId}>
            {!viewResolved ? (
              <Skeleton className="h-[calc(100vh-290px)] min-h-[520px] w-full rounded-lg" />
            ) : asTable ? (
              <GraphTable investigation={selected} placements={placements} />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-card px-4 py-2.5">
                  <GraphLegend />
                </div>
                <TransmissionGraph
                  investigation={selected}
                  chains={selected.transmission_chains}
                  placements={placements}
                  height="h-[calc(100vh-330px)] min-h-[480px]"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function GraphExplorerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ui text-muted-foreground">Loading…</div>}>
      <GraphExplorer />
    </Suspense>
  );
}
