"use client";

import { useEffect, useState } from "react";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase, InvestigationStatus } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestigationCard } from "@/components/investigation/investigation-card";
import { StatusBadge } from "@/components/investigation/status-badge";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Users,
  TrendingUp,
} from "lucide-react";

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

  // Derive metrics from loaded data
  const statusCounts: Record<InvestigationStatus, number> = {
    SUSPECTED_CLUSTER: 0,
    HIGH_PRIORITY_INVESTIGATION: 0,
    POTENTIAL_CONTACT: 0,
    NO_SIGNAL: 0,
  };
  for (const c of cases) {
    if (c.status in statusCounts) statusCounts[c.status]++;
  }

  const organismCounts: Record<string, number> = {};
  for (const c of cases) {
    organismCounts[c.organism] = (organismCounts[c.organism] || 0) + 1;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Investigation Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Hospital-acquired infection surveillance overview
        </p>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          Loading investigations…
        </div>
      )}
      {error && (
        <Card className="border-rose-500/30">
          <CardContent className="p-4 flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Failed to load data</p>
              <p className="text-xs text-rose-400/70">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Activity}
              label="Total Investigations"
              value={cases.length}
              color="teal"
            />
            <MetricCard
              icon={ShieldAlert}
              label="Suspected Clusters"
              value={statusCounts.SUSPECTED_CLUSTER}
              color="amber"
            />
            <MetricCard
              icon={TrendingUp}
              label="High Priority"
              value={statusCounts.HIGH_PRIORITY_INVESTIGATION}
              color="orange"
            />
            <MetricCard
              icon={Users}
              label="Potential Contacts"
              value={statusCounts.POTENTIAL_CONTACT}
              color="blue"
            />
          </div>

          {/* Status Distribution */}
          {cases.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {(Object.entries(statusCounts) as [InvestigationStatus, number][])
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800"
                      >
                        <StatusBadge status={status} />
                        <span className="text-lg font-bold text-slate-200">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organism Distribution */}
          {Object.keys(organismCounts).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Organism Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(organismCounts).map(([org, count]) => (
                    <div
                      key={org}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300 italic">{org}</span>
                      <span className="text-slate-400 font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Investigations */}
          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-3">
              Recent Investigations
            </h2>
            {cases.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-slate-500">
                  No investigations found. Create a new investigation to get
                  started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cases
                  .sort(
                    (a, b) =>
                      new Date(b.generated_at).getTime() -
                      new Date(a.generated_at).getTime()
                  )
                  .slice(0, 5)
                  .map((c) => (
                    <InvestigationCard key={c.case_id} investigation={c} />
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  const classes = colorMap[color] || colorMap.teal;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${classes}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
