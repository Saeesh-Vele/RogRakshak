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
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBand } from "@/components/dashboard/status-band";
import { TrendChart } from "@/components/dashboard/trend-chart";
import {
  StatusBadge,
  STATUS_RAIL,
} from "@/components/investigation/status-badge";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <PageHeader
        eyebrow="Surveillance"
        title="Dashboard"
        description={
          loading
            ? "Loading investigations…"
            : error
              ? "Figures unavailable while the data source is unreachable."
              : `Derived from ${cases.length} investigation${
                  cases.length === 1 ? "" : "s"
                } · ${mode === "mock" ? "fixture data" : "live graph"}`
        }
        actions={
          <Link href="/investigations/new">
            <Button>
              <Plus />
              New investigation
            </Button>
          </Link>
        }
      />

      {loading && (
        <div
          className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
          aria-hidden
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-3 bg-card px-5 py-5">
              <div className="h-2 w-24 rounded bg-muted" />
              <div className="h-8 w-12 rounded bg-muted" />
              <div className="h-2 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <Panel className="border-node-infected/30">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-node-infected" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Failed to load data
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Panel>
      )}

      {!loading && !error && (
        <>
          <StatusBand
            stats={[
              {
                label: "Active cases",
                value: metrics.activeCases,
                tone: "primary",
                hint:
                  metrics.casesThisWeek > 0
                    ? `+${metrics.casesThisWeek} this week`
                    : "None this week",
                emphasiseHint: metrics.casesThisWeek > 0,
              },
              {
                label: "High-risk contacts",
                value: metrics.highRiskContacts,
                tone: "high",
                hint: `${metrics.highRiskLinks} with high-tier evidence`,
              },
              {
                label: "Potential clusters",
                value: metrics.potentialClusters,
                tone: "medium",
                hint:
                  metrics.highPriorityCount > 0
                    ? `${metrics.highPriorityCount} high priority`
                    : "None escalated",
                emphasiseHint: metrics.highPriorityCount > 0,
              },
              {
                label: "Flagged locations",
                value: metrics.flaggedLocations,
                tone: "location",
                hint: metrics.topLocation ?? "No locations in evidence",
              },
            ]}
          />

          {/* Cases + where they are happening */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel>
              <PanelHeader
                title="Active infection cases"
                meta={`${sorted.length} case${sorted.length !== 1 ? "s" : ""}`}
                actions={
                  sorted.length > 0 && (
                    <Link
                      href="/investigations"
                      className="rounded-md px-2 py-1 text-[0.8125rem] font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      View all
                    </Link>
                  )
                }
              />
              {sorted.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-foreground">No investigations yet.</p>
                  <p className="mx-auto mt-1 max-w-xs text-[0.8125rem] leading-relaxed text-muted-foreground">
                    Point the workflow at an index patient and organism to build
                    the first case.
                  </p>
                  <Link href="/investigations/new" className="mt-4 inline-block">
                    <Button size="sm">
                      <Plus />
                      New investigation
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-hairline">
                  {sorted.map((c) => {
                    const started = caseStartedAt(c);
                    const contacts = c.candidate_patients.length;
                    return (
                      <li key={c.case_id}>
                        <Link
                          href={`/investigations/${c.case_id}`}
                          className="group relative flex items-center gap-4 py-3.5 pl-6 pr-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-y-2 left-0 w-[3px] rounded-r",
                              STATUS_RAIL[c.status] ?? "bg-node-neutral"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span className="font-mono text-[0.8125rem] font-medium text-foreground">
                                {c.case_id}
                              </span>
                              <StatusBadge status={c.status} />
                            </div>
                            <p className="mt-1.5 truncate text-[0.8125rem] text-muted-foreground">
                              {c.index_patient.name} ·{" "}
                              <span className="italic">{c.organism}</span>
                              {c.resistance_profile && ` · ${c.resistance_profile}`}
                              {contacts > 0 &&
                                ` · ${contacts} contact${contacts !== 1 ? "s" : ""}`}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="font-display text-[1.25rem] leading-none tabular-nums text-foreground">
                              {Math.round(c.confidence * 100)}
                              <span className="text-[0.75rem] text-muted-foreground">
                                %
                              </span>
                            </p>
                            <p
                              className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground"
                              title={
                                started.isFallback
                                  ? "No timeline events — showing when the investigation was generated"
                                  : new Date(started.iso).toLocaleString("en-GB")
                              }
                            >
                              {formatDay(started.iso)}
                            </p>
                          </div>

                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Flagged locations"
                meta={`${locations.length} flagged`}
              />
              {locations.length === 0 ? (
                <p className="px-5 py-8 text-center text-[0.8125rem] text-muted-foreground">
                  No locations recorded in contact evidence.
                </p>
              ) : (
                <ul className="divide-hairline">
                  {locations.map((loc) => (
                    <li
                      key={loc.name}
                      className="relative flex items-start justify-between gap-3 py-3.5 pl-6 pr-5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-2 left-0 w-[3px] rounded-r",
                          loc.tier === "HIGH"
                            ? "bg-node-infected"
                            : "bg-node-downstream"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[0.875rem] font-medium leading-tight text-foreground">
                          {loc.name}
                        </p>
                        <p className="mt-1.5 font-mono text-[0.6875rem] leading-snug text-muted-foreground">
                          {loc.evidenceCount} evidence item
                          {loc.evidenceCount !== 1 ? "s" : ""} ·{" "}
                          {loc.caseIds.length} case
                          {loc.caseIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em]",
                          loc.tier === "HIGH"
                            ? "text-node-infected"
                            : "text-risk-medium-foreground"
                        )}
                      >
                        {loc.tier}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title="Epidemic curve"
              description="New confirmed positives per day, from recorded culture dates, with the running total."
            />
            <div className="pb-4 pt-4">
              <TrendChart points={trend} />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
