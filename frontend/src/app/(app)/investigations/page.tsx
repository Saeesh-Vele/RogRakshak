"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import type { InvestigationCase, InvestigationStatus } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { caseStartedAt } from "@/lib/metrics";
import { StatusBadge } from "@/components/investigation/status-badge";
import { TierStrip } from "@/components/investigation/tier-strip";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

type SortKey = "confidence" | "date" | "contacts";

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="flex items-center justify-end gap-2.5">
      <span aria-hidden className="h-1.5 w-16 bg-sunken">
        <span className="block h-full bg-foreground" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-9 text-right font-mono text-ui text-foreground">{pct}%</span>
    </span>
  );
}

function FirstEvent({ c }: { c: InvestigationCase }) {
  const s = caseStartedAt(c);
  return (
    <span
      className={cn("font-mono text-meta", s.isFallback ? "text-muted-foreground" : "text-foreground")}
      title={s.isFallback ? "No timeline events: showing when the investigation was generated" : undefined}
    >
      {fmtDay(s.iso)}
      {s.isFallback && <span className="sr-only"> (generated date, no timeline events)</span>}
    </span>
  );
}

export default function InvestigationsListPage() {
  const { cases, status, error, startedAt, load } = useCasesStore();
  const loading = status === "idle" || status === "loading";
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("confidence");
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    void load();
  }, [load, mode]);

  // Reflect searches that navigate here with ?q=
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = cases.filter(
      (c) =>
        (statusFilter === "ALL" || c.status === statusFilter) &&
        (!q ||
          [c.case_id, c.organism, c.resistance_profile, c.index_patient.name, c.index_patient.mrn]
            .some((f) => (f ?? "").toLowerCase().includes(q)) ||
          c.candidate_patients.some((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)))
    );
    return result.sort((a, b) =>
      sortBy === "confidence"
        ? b.confidence - a.confidence
        : sortBy === "contacts"
          ? b.candidate_patients.length - a.candidate_patients.length
          : new Date(caseStartedAt(b).iso).getTime() - new Date(caseStartedAt(a).iso).getTime()
    );
  }, [cases, search, statusFilter, sortBy]);

  const filtering = search.trim() !== "" || statusFilter !== "ALL";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
      <PageHeader
        eyebrow="Case log"
        title="Investigations"
        description="Every investigation the workflow has produced, strongest first."
        actions={
          <Link href="/investigations/new" className={buttonVariants()}>
            <Plus />
            New investigation
          </Link>
        }
      />

      {/* Toolbar */}
      <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            aria-label="Search investigations"
            placeholder="Case ID, patient, MRN or organism"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <div className="sm:w-[180px]">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvestigationStatus | "ALL")}
            >
              <option value="ALL">All statuses</option>
              <option value="SUSPECTED_CLUSTER">Suspected cluster</option>
              <option value="HIGH_PRIORITY_INVESTIGATION">High priority</option>
              <option value="POTENTIAL_CONTACT">Potential contact</option>
              <option value="NO_SIGNAL">No signal</option>
            </Select>
          </div>
          <div className="sm:w-[180px]">
            <Select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
              <option value="confidence">Sort: confidence</option>
              <option value="date">Sort: first event</option>
              <option value="contacts">Sort: contacts</option>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <LoadingState
          startedAt={startedAt}
          skeleton={
            <div className="divide-hairline border-y border-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-6 py-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="ml-auto h-3 w-24" />
                </div>
              ))}
            </div>
          }
        />
      )}

      {status === "error" && (
        <ErrorState
          title="Couldn't load investigations"
          message={error ?? "The analysis service did not return the case list."}
          onRetry={() => void load({ force: true })}
        />
      )}

      {status === "ready" && (
        <>
          <p role="status" className="font-mono text-meta text-muted-foreground">
            {filtered.length} of {cases.length} investigation{cases.length === 1 ? "" : "s"}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              className="rounded-lg border border-border bg-card"
              title={cases.length === 0 ? "No investigations yet" : "Nothing matches"}
              body={
                cases.length === 0
                  ? "Run the workflow against an index patient to create the first case."
                  : "No investigation matches the search and status filter."
              }
              action={
                cases.length === 0 ? (
                  <Link href="/investigations/new" className={buttonVariants()}>
                    <Plus />
                    Start an investigation
                  </Link>
                ) : (
                  filtering && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("ALL");
                      }}
                    >
                      Clear filters
                    </Button>
                  )
                )
              }
            />
          ) : (
            <>
              {/* Wide screens: one dense table */}
              <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
                <table className="w-full border-collapse text-ui">
                  <caption className="sr-only">Investigations</caption>
                  <thead>
                    <tr className="border-b border-border">
                      {["Case", "Index patient", "Organism", "Contacts", "Evidence (H · M · L)", "First event", "Confidence"].map(
                        (h, i) => (
                          <th
                            key={h}
                            scope="col"
                            className={cn(
                              "h-9 px-4 text-left align-middle text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground",
                              (i === 3 || i === 6) && "text-right"
                            )}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr
                        key={c.case_id}
                        className="relative border-b border-border transition-colors last:border-0 hover:bg-sunken/60"
                      >
                        <td className="px-4 py-3 align-middle">
                          {/* The case link covers the whole row */}
                          <Link
                            href={`/investigations/${c.case_id}`}
                            className="font-mono font-medium text-foreground after:absolute after:inset-0 hover:underline"
                          >
                            {c.case_id}
                          </Link>
                          <span className="mt-1 block">
                            <StatusBadge status={c.status} />
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="block text-foreground">{c.index_patient.name}</span>
                          <span className="font-mono text-meta text-muted-foreground">{c.index_patient.mrn}</span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="italic text-foreground">{c.organism}</span>
                          {c.resistance_profile && <span className="text-muted-foreground"> {c.resistance_profile}</span>}
                        </td>
                        <td className="px-4 py-3 text-right align-middle font-mono text-foreground">
                          {c.candidate_patients.length}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <TierStrip items={c.evidence} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <FirstEvent c={c} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <Confidence value={c.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Narrow screens: the same facts, stacked */}
              <ul className="divide-hairline rounded-lg border border-border bg-card md:hidden">
                {filtered.map((c) => (
                  <li key={c.case_id}>
                    <Link href={`/investigations/${c.case_id}`} className="block space-y-2 px-4 py-3.5">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-mono font-medium text-foreground">{c.case_id}</span>
                        <StatusBadge status={c.status} />
                      </span>
                      <span className="block text-ui text-muted-foreground">
                        <span className="text-foreground">{c.index_patient.name}</span> ·{" "}
                        <span className="italic">{c.organism}</span> {c.resistance_profile}
                      </span>
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <TierStrip items={c.evidence} />
                        <Confidence value={c.confidence} />
                      </span>
                      <span className="block font-mono text-meta text-muted-foreground">
                        {c.candidate_patients.length} contacts · first event <FirstEvent c={c} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
