"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { DashboardSummary } from "@/types/api";
import { Patient } from "@/types/patient";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CasesTable } from "@/components/dashboard/cases-table";
import { ClusterAlerts } from "@/components/dashboard/cluster-alerts";
import { Activity, RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumData, patData] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getPatients(),
      ]);
      setSummary(sumData);
      setPatients(patData.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              Infection Surveillance Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <Activity className="size-3" /> Live Surveillance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time hospital ward monitoring, automated outbreak detection, and contact network analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="size-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Loading hospital surveillance records...
          </p>
          <p className="text-xs text-slate-500">
            Aggregating ADT movement logs and microbiological AST reports.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Failed to load surveillance data</h4>
            <p className="text-xs mt-1 text-rose-700">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-3 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      {!isLoading && summary && (
        <>
          {/* Critical Cluster Alert Banner */}
          <ClusterAlerts summary={summary} />

          {/* KPI Metric Cards */}
          <SummaryCards summary={summary} />

          {/* Cases TanStack Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent & Active Case Investigations
                </h2>
                <p className="text-xs text-slate-500">
                  Select a patient to inspect co-location timeline, contact graph, and AI agent investigation report.
                </p>
              </div>
            </div>

            <CasesTable patients={patients} />
          </div>
        </>
      )}
    </div>
  );
}
