"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchPatientPlacements } from "@/lib/patient-placement";
import type { PatientPlacement } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import {
  GraphLegend,
  TransmissionGraph,
} from "@/components/investigation/transmission-graph";
import { PageHeader } from "@/components/layout/page-header";

function GraphExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useAppStore((s) => s.mode);

  const { cases, status, error, startedAt, load } = useCasesStore();
  const loading = status === "idle" || status === "loading";
  const [selectedId, setSelectedId] = useState<string>("");
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>(
    {}
  );

  useEffect(() => {
    void load();
  }, [load, mode]);

  // The list endpoint already returns full cases, so no per-case fetch is
  // needed to render the graph. Pick the ?case= one if present, else the first.
  useEffect(() => {
    if (status !== "ready") return;
    setSelectedId((current) => {
      if (current && cases.some((c) => c.case_id === current)) return current;
      const requested = searchParams.get("case");
      return (
        cases.find((c) => c.case_id === requested)?.case_id ??
        cases[0]?.case_id ??
        ""
      );
    });
  }, [status, cases, searchParams]);

  const selected = useMemo(
    () => cases.find((c) => c.case_id === selectedId) ?? null,
    [cases, selectedId]
  );

  useEffect(() => {
    if (!selected || mode === "mock") return;
    let cancelled = false;
    const ids = [
      selected.index_patient.id,
      ...selected.candidate_patients.map((p) => p.id),
    ];
    fetchPatientPlacements(ids)
      .then((p) => {
        if (!cancelled) setPlacements(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected, mode]);

  const onSelect = useCallback(
    (caseId: string) => {
      setSelectedId(caseId);
      setPlacements({});
      router.replace(`/graph?case=${encodeURIComponent(caseId)}`, {
        scroll: false,
      });
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6 lg:p-8">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          eyebrow="Graph explorer"
          title="Temporal contact network"
          description={
            selected
              ? `Staff-mediated contact pathways for ${selected.case_id} · ${selected.index_patient.name}`
              : "Select a case to view its contact network."
          }
        />

        <div className="w-full shrink-0 sm:w-[320px]">
          <label
            htmlFor="case-picker"
            className="mb-1.5 block text-eyebrow font-semibold uppercase text-muted-foreground"
          >
            Investigation
          </label>
          <Select
            id="case-picker"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            disabled={loading || cases.length === 0}
          >
            {cases.length === 0 && <option value="">No investigations</option>}
            {cases.map((c) => (
              <option key={c.case_id} value={c.case_id}>
                {c.case_id} — {c.index_patient.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <LoadingState
          startedAt={startedAt}
          skeleton={<Skeleton className="h-[520px] w-full rounded-lg" />}
        />
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
            <Link href="/investigations/new" className="text-ui font-medium text-primary hover:underline">
              Start an investigation
            </Link>
          }
        />
      )}

      {status === "ready" && selected && (
        <Panel>
          {/* Toolbar strip: the key on the left, the way out on the right */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-muted/40 px-5 py-3">
            <GraphLegend />
            <Link
              href={`/investigations/${selected.case_id}`}
              className="shrink-0 rounded-md px-2 py-1 text-[0.8125rem] font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Open full investigation →
            </Link>
          </div>
          <div>
            <TransmissionGraph
              investigation={selected}
              chains={selected.transmission_chains}
              placements={placements}
              height="h-[calc(100vh-320px)] min-h-[520px]"
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function GraphExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <GraphExplorer />
    </Suspense>
  );
}
