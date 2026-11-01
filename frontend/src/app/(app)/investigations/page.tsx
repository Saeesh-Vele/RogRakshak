"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { InvestigationStatus } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { useCasesStore } from "@/lib/cases-store";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { caseStartedAt } from "@/lib/metrics";
import { StatusBadge } from "@/components/investigation/status-badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvestigationsListPage() {
  const { cases, status, error, startedAt, load } = useCasesStore();
  const loading = status === "idle" || status === "loading";
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | "ALL">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState<"confidence" | "date">("confidence");
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    void load();
  }, [load, mode]);

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

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Case log"
        title="Investigations"
        description="Every outbreak investigation the workflow has produced."
        actions={
          <Link href="/investigations/new">
            <Button>
              <Plus />
              New investigation
            </Button>
          </Link>
        }
      />

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
        <LoadingState
          startedAt={startedAt}
          skeleton={
            <div className="divide-hairline rounded-lg border border-border bg-card">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-6 px-3 py-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="ml-auto h-3 w-10" />
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
          <p className="text-sm text-muted-foreground">
            {filtered.length} investigation{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== cases.length && ` of ${cases.length}`}
          </p>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                {cases.length === 0 ? (
                  <>
                    No investigations yet.{" "}
                    <Link
                      href="/investigations/new"
                      className="font-medium text-primary hover:underline"
                    >
                      Start one
                    </Link>
                    .
                  </>
                ) : (
                  "No investigations match your search criteria."
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
                    return (
                      <TableRow key={c.case_id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <Link
                            href={`/investigations/${c.case_id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {c.case_id}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {c.index_patient.name}
                          <span className="ml-2 text-[0.8125rem] text-muted-foreground/70">
                            {c.candidate_patients.length} contact
                            {c.candidate_patients.length !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="italic">{c.organism}</span>
                          {c.resistance_profile && (
                            <span className="ml-1.5 whitespace-nowrap text-muted-foreground">
                              · {c.resistance_profile}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {Math.round(c.confidence * 100)}%
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
