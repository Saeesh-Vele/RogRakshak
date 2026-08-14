"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getProvider } from "@/lib/data-provider";
import type { CreateInvestigationRequest } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PlusCircle, Loader2 } from "lucide-react";

export default function NewInvestigationPage() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);

  const [patientId, setPatientId] = useState("1");
  const [organism, setOrganism] = useState("Klebsiella pneumoniae");
  const [resistance, setResistance] = useState("MDR");
  const [useMockGraph, setUseMockGraph] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pid = parseInt(patientId, 10);
    if (isNaN(pid) || pid < 1) {
      setError("Patient ID must be a positive integer.");
      return;
    }
    if (!organism.trim()) {
      setError("Organism is required.");
      return;
    }

    setSubmitting(true);
    try {
      const request: CreateInvestigationRequest = {
        target_patient_id: pid,
        organism: organism.trim(),
        resistance_profile: resistance.trim() || null,
        use_mock_graph: useMockGraph,
      };
      const result = await getProvider().create(request);
      router.push(`/investigations/${result.case_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Investigation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          New Investigation
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Trigger an epidemiological investigation workflow
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investigation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="patientId"
                className="text-sm font-medium text-slate-300"
              >
                Target Patient ID
              </label>
              <Input
                id="patientId"
                type="number"
                min={1}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. 1"
                required
              />
              <p className="text-xs text-slate-500">
                The index patient to investigate.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="organism"
                className="text-sm font-medium text-slate-300"
              >
                Organism
              </label>
              <Input
                id="organism"
                value={organism}
                onChange={(e) => setOrganism(e.target.value)}
                placeholder="e.g. Klebsiella pneumoniae"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="resistance"
                className="text-sm font-medium text-slate-300"
              >
                Resistance Profile (optional)
              </label>
              <Input
                id="resistance"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                placeholder="e.g. MDR"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="useMockGraph"
                type="checkbox"
                checked={useMockGraph}
                onChange={(e) => setUseMockGraph(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
              />
              <label
                htmlFor="useMockGraph"
                className="text-sm text-slate-400"
              >
                Use offline mock graph (development only)
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Investigation…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Start Investigation
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mode === "mock" && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ⚠ Mock mode active — the investigation result will use pre-computed
          fixture data regardless of the parameters entered.
        </div>
      )}
    </div>
  );
}
