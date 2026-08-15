"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase, InvestigationStatus } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { caseStartedAt } from "@/lib/metrics";
import { StatusBadge } from "@/components/investigation/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, RefreshCw, RotateCcw, Search } from "lucide-react";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InvestigationsListContent() {
  const router = useRouter();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | "ALL">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState<"confidence" | "date">("confidence");
  const mode = useAppStore((s) => s.mode);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getProvider().list();
      setCases(resp.cases);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load investigations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, mode]);

  // Reflect top-bar searches that navigate here with a ?q= param
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...cases];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.organism.toLowerCase().includes(q) ||
          c.index_patient.name.toLowerCase().includes(q) ||
          c.candidate_patients.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) =>
      sortBy === "confidence"
        ? b.confidence - a.confidence
        : new Date(caseStartedAt(b).iso).getTime() -
          new Date(caseStartedAt(a).iso).getTime()
    );

    return result;
  }, [cases, search, statusFilter, sortBy]);

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== "ALL");

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setSortBy("confidence");
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-[1.625rem] font-bold tracking-tight text-foreground">
          Investigations
        </h1>
        <p className="mt-1 text-[0.9rem] text-muted-foreground">
          All outbreak investigation cases — sorted by confidence
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            placeholder="Search by case ID, organism, patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="sm:w-[190px]">
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as InvestigationStatus | "ALL")
            }
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUSPECTED_CLUSTER">Suspected Cluster</option>
            <option value="HIGH_PRIORITY_INVESTIGATION">High Priority</option>
            <option value="POTENTIAL_CONTACT">Potential Contact</option>
            <option value="NO_SIGNAL">No Signal</option>
          </Select>
        </div>
        <div className="sm:w-[190px]">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "confidence" | "date")}
            aria-label="Sort by"
          >
            <option value="confidence">Sort by Confidence</option>
            <option value="date">Sort by First Event</option>
          </Select>
        </div>
      </div>

      {loading && (
        <Card className="overflow-hidden p-5 space-y-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full rounded bg-muted/60" />
            ))}
          </div>
        </Card>
      )}

      {error && !loading && (
        <Card className="border-risk-high-foreground/20">
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Unable to load investigations
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} investigation{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== cases.length && ` of ${cases.length}`}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground space-y-3">
                {cases.length === 0 ? (
                  <p>
                    No investigations yet.{" "}
                    <Link
                      href="/investigations/new"
                      className="font-medium text-primary hover:underline"
                    >
                      Start one
                    </Link>
                    .
                  </p>
                ) : (
                  <div>
                    <p>No investigations match your filter criteria.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="mt-3 inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Case</TableHead>
                    <TableHead>Index Patient</TableHead>
                    <TableHead>Organism</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      First Event
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const started = caseStartedAt(c);
                    const confPct = Math.round(c.confidence * 100);
                    return (
                      <TableRow
                        key={c.case_id}
                        onClick={() => router.push(`/investigations/${c.case_id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[0.8125rem] font-semibold text-primary">
                            {c.case_id}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="font-medium text-foreground">{c.index_patient.name}</p>
                          <p className="text-[0.8125rem] text-muted-foreground">
                            {c.candidate_patients.length} contact{c.candidate_patients.length !== 1 ? "s" : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="italic text-foreground">{c.organism}</span>
                          {c.resistance_profile && (
                            <span className="ml-1.5 whitespace-nowrap font-mono text-[0.8125rem] text-muted-foreground">
                              {c.resistance_profile}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="font-semibold tabular-nums text-foreground">{confPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                          <span
                            title={
                              started.isFallback
                                ? "No timeline events — showing when the investigation was generated"
                                : new Date(started.iso).toLocaleString("en-GB")
                            }
                            className={started.isFallback ? "italic" : undefined}
                          >
                            {formatDay(started.iso)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function InvestigationsListPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading investigations…
          </div>
        </div>
      }
    >
      <InvestigationsListContent />
    </Suspense>
  );
}
