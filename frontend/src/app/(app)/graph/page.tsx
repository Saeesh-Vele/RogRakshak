"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getProvider } from "@/lib/data-provider";
import { fetchPatientPlacements } from "@/lib/patient-placement";
import type {
  InvestigationCase,
  PatientPlacement,
} from "@/types/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  GraphLegend,
  TransmissionGraph,
} from "@/components/investigation/transmission-graph";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

function GraphExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useAppStore((s) => s.mode);

  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<number, PatientPlacement>>(
    {}
  );

  // The list endpoint already returns full cases, so no per-case fetch is
  // needed to render the graph — this reuses exactly the payload the detail
  // page uses, just selected by dropdown instead of a route param.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await getProvider().list();
        if (cancelled) return;
        setCases(resp.cases);
        const requested = searchParams.get("case");
        const initial =
          resp.cases.find((c) => c.case_id === requested)?.case_id ??
          resp.cases[0]?.case_id ??
          "";
        setSelectedId(initial);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load cases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // searchParams intentionally read once on mount for the initial selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
        <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading investigations…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Failed to load investigations
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !selected && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No investigations available.{" "}
            <Link
              href="/investigations/new"
              className="font-medium text-primary hover:underline"
            >
              Start one
            </Link>
            .
          </CardContent>
        </Card>
      )}

      {!loading && !error && selected && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <GraphLegend />
            <Link
              href={`/investigations/${selected.case_id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open full investigation →
            </Link>
          </div>
          <div className="border-t border-border">
            <TransmissionGraph
              investigation={selected}
              chains={selected.transmission_chains}
              placements={placements}
              height="h-[calc(100vh-320px)] min-h-[520px]"
            />
          </div>
        </Card>
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
