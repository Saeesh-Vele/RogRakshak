"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
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
import { Activity, AlertTriangle, MapPin, RefreshCw, Users } from "lucide-react";

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mode = useAppStore((s) => s.mode);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider();
      const resp = await provider.list();
      setCases(resp.cases);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load investigation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, mode]);

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
      {/* Page header */}
      {!loading && !error && (
        <div>
          <h1 className="text-[1.625rem] font-bold tracking-tight text-foreground">
            Surveillance Dashboard
          </h1>
          <p className="mt-1 text-[0.9rem] text-muted-foreground">
            HAI outbreak monitoring · General Hospital · Infection Prevention &amp; Control
          </p>
        </div>
      )}
      {loading && (
        <div className="space-y-6 animate-pulse">
          {/* Skeleton stat row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="mt-3 h-9 w-16 rounded bg-muted" />
                <div className="mt-3 h-3 w-32 rounded bg-muted" />
              </Card>
            ))}
          </div>

          {/* Skeleton main content */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="overflow-hidden p-5 space-y-4">
              <div className="h-5 w-44 rounded bg-muted" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-full rounded bg-muted/60" />
                ))}
              </div>
            </Card>
            <Card className="p-5 space-y-4">
              <div className="h-5 w-36 rounded bg-muted" />
              <div className="space-y-3 pt-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 w-full rounded bg-muted/60" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {error && !loading && (
        <Card className="border-risk-high-foreground/20">
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Unable to load investigation data
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
          {/* Stat row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active Cases"
              value={metrics.activeCases}
              href="/investigations"
              icon={<Activity className="h-3.5 w-3.5" />}
              hint={
                metrics.casesThisWeek > 0
                  ? `+${metrics.casesThisWeek} this week`
                  : "No new cases this week"
              }
              hintTone={metrics.casesThisWeek > 0 ? "primary" : "muted"}
            />
            <StatCard
              label="High-Risk Contacts"
              value={metrics.highRiskContacts}
              href="/investigations"
              icon={<Users className="h-3.5 w-3.5" />}
              hint={`${metrics.highRiskLinks} with high-tier evidence`}
            />
            <StatCard
              label="Potential Clusters"
              value={metrics.potentialClusters}
              href="/investigations"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
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
              icon={<MapPin className="h-3.5 w-3.5" />}
              hint={metrics.topLocation ?? "No locations in evidence"}
            />
          </div>

          {/* Cases table + flagged locations */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Active Infection Cases</CardTitle>
                  <span className="text-[0.8125rem] font-medium text-muted-foreground">
                    {sorted.length} case{sorted.length !== 1 ? "s" : ""}
                  </span>
                </div>
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
              <CardHeader className="pb-3">
                <CardTitle>Flagged Locations</CardTitle>
                <p className="text-sm text-muted-foreground">Hot-spots by evidence volume</p>
              </CardHeader>
              {locations.length === 0 ? (
                <CardContent className="pb-8 pt-2 text-sm text-muted-foreground">
                  No locations recorded in contact evidence.
                </CardContent>
              ) : (
                <div className="border-t border-border">
                  {locations.map((loc) => {
                    const maxCount = locations[0]?.evidenceCount ?? 1;
                    const pct = Math.round((loc.evidenceCount / maxCount) * 100);
                    return (
                      <div
                        key={loc.name}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[0.9rem] font-medium text-foreground">
                              {loc.name}
                            </p>
                            <Badge
                              variant={loc.tier === "HIGH" ? "riskHigh" : "riskMedium"}
                              className="shrink-0"
                            >
                              {loc.tier === "HIGH" ? "High" : "Medium"}
                            </Badge>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                loc.tier === "HIGH" ? "bg-risk-high-foreground/70" : "bg-risk-medium-foreground/70"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[0.75rem] text-muted-foreground">
                            {loc.evidenceCount} evidence item{loc.evidenceCount !== 1 ? "s" : ""} ·{" "}
                            {loc.caseIds.length} case{loc.caseIds.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
