"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase } from "@/types/api";
import { useAppStore } from "@/lib/store";
import {
  deriveMetrics,
  deriveFlaggedLocations,
  deriveTrend,
  caseStartedAt,
} from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { StatusBadge } from "@/components/investigation/status-badge";
import { AlertTriangle } from "lucide-react";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default function DashboardPage() {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const provider = getProvider();
        const resp = await provider.list();
        if (!cancelled) setCases(resp.cases);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const metrics = useMemo(() => deriveMetrics(cases), [cases]);
  const locations = useMemo(() => deriveFlaggedLocations(cases), [cases]);
  const trend = useMemo(() => deriveTrend(cases), [cases]);

  const sorted = useMemo(
    () =>
      [...cases].sort(
        (a, b) =>
          new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      ),
    [cases]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      {loading && (
        <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading investigations…
        </div>
      )}

      {error && (
        <Card className="border-risk-high-foreground/20">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Failed to load data
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active Cases"
              value={metrics.activeCases}
              hint={
                metrics.casesThisWeek > 0
                  ? `+${metrics.casesThisWeek} this week`
                  : "None this week"
              }
              hintTone={metrics.casesThisWeek > 0 ? "primary" : "muted"}
            />
            <StatCard
              label="High-Risk Contacts"
              value={metrics.highRiskContacts}
              hint={`${metrics.highRiskLinks} with high-tier evidence`}
            />
            <StatCard
              label="Potential Clusters"
              value={metrics.potentialClusters}
              hint={
                metrics.highPriorityCount > 0
                  ? `${metrics.highPriorityCount} high priority`
                  : "None escalated"
              }
              hintTone={metrics.highPriorityCount > 0 ? "high" : "muted"}
            />
            <StatCard
              label="Flagged Locations"
              value={metrics.flaggedLocations}
              hint={metrics.topLocation ?? "No locations in evidence"}
            />
          </div>

          {/* Cases table + flagged locations */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="overflow-hidden">
              <CardHeader className="px-5 pb-4 pt-5">
                <CardTitle>Active Infection Cases</CardTitle>
              </CardHeader>
              {sorted.length === 0 ? (
                <CardContent className="pb-8 pt-2 text-center text-sm text-muted-foreground">
                  No investigations yet.{" "}
                  <Link
                    href="/investigations/new"
                    className="font-medium text-primary hover:underline"
                  >
                    Start one
                  </Link>
                  .
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Case</TableHead>
                      <TableHead>Index Patient</TableHead>
                      <TableHead>Organism</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        First Event
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((c) => (
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
                        <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                          {(() => {
                            const started = caseStartedAt(c);
                            return (
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
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="px-5 pb-4 pt-5">
                <CardTitle>Flagged Locations</CardTitle>
              </CardHeader>
              {locations.length === 0 ? (
                <CardContent className="pb-8 pt-2 text-sm text-muted-foreground">
                  No locations recorded in contact evidence.
                </CardContent>
              ) : (
                <div className="divide-hairline border-t border-border">
                  {locations.map((loc) => (
                    <div
                      key={loc.name}
                      className="flex items-start justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {loc.name}
                        </p>
                        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                          {loc.evidenceCount} evidence item
                          {loc.evidenceCount !== 1 ? "s" : ""} ·{" "}
                          {loc.caseIds.length} case
                          {loc.caseIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge
                        variant={loc.tier === "HIGH" ? "riskHigh" : "riskMedium"}
                        className="shrink-0"
                      >
                        {loc.tier === "HIGH" ? "High Risk" : "Medium Risk"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Trend */}
          <Card>
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle>Confirmed Positives — Cumulative</CardTitle>
              <p className="text-sm text-muted-foreground">
                From recorded culture dates across all investigated patients.
              </p>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <TrendChart points={trend} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
