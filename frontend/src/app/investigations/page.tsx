"use client";

import { useEffect, useState, useMemo } from "react";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase, InvestigationStatus } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { InvestigationCard } from "@/components/investigation/investigation-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Search } from "lucide-react";

export default function InvestigationsListPage() {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | "ALL">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState<"confidence" | "date">("confidence");
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await getProvider().list();
        if (!cancelled) setCases(resp.cases);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    let result = [...cases];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.organism.toLowerCase().includes(q) ||
          c.index_patient.name.toLowerCase().includes(q) ||
          c.candidate_patients.some((p) =>
            p.name.toLowerCase().includes(q)
          )
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Sort
    result.sort((a, b) =>
      sortBy === "confidence"
        ? b.confidence - a.confidence
        : new Date(b.generated_at).getTime() -
          new Date(a.generated_at).getTime()
    );

    return result;
  }, [cases, search, statusFilter, sortBy]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Investigations</h1>
        <p className="text-sm text-slate-400 mt-1">
          All outbreak investigation cases
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by case ID, organism, patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as InvestigationStatus | "ALL")
          }
          className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUSPECTED_CLUSTER">Suspected Cluster</option>
          <option value="HIGH_PRIORITY_INVESTIGATION">High Priority</option>
          <option value="POTENTIAL_CONTACT">Potential Contact</option>
          <option value="NO_SIGNAL">No Signal</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "confidence" | "date")}
          className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Sort by"
        >
          <option value="confidence">Sort by Confidence</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-400 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          Loading investigations…
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-rose-500/30">
          <CardContent className="p-4 flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Failed to load investigations</p>
              <p className="text-xs text-rose-400/70">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          <p className="text-xs text-slate-500">
            {filtered.length} investigation{filtered.length !== 1 ? "s" : ""}{" "}
            found
          </p>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                {cases.length === 0
                  ? "No investigations found. Create a new investigation to get started."
                  : "No investigations match your search criteria."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <InvestigationCard key={c.case_id} investigation={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
