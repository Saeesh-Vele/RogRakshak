"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProvider } from "@/lib/data-provider";
import type { InvestigationCase } from "@/types/api";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { StatusBadge } from "@/components/investigation/status-badge";
import { ConfidenceGauge } from "@/components/investigation/confidence-gauge";
import { ScoringBreakdownView } from "@/components/investigation/scoring-breakdown";
import { EvidenceCard } from "@/components/investigation/evidence-card";
import { TransmissionGraph } from "@/components/investigation/transmission-graph";
import { TimelineView } from "@/components/investigation/timeline-view";
import { PatientCard } from "@/components/investigation/patient-card";
import {
  AlertTriangle,
  ArrowLeft,
  FlaskConical,
  ShieldAlert,
  FileText,
  Users,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function InvestigationDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [investigation, setInvestigation] = useState<InvestigationCase | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getProvider().get(caseId);
        if (!cancelled) {
          if (result) {
            setInvestigation(result);
          } else {
            setError(`Investigation case '${caseId}' not found.`);
          }
        }
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
  }, [caseId, mode]);

  const onSelectEvidence = useCallback((evidenceId: string) => {
    const el = document.getElementById(`evidence-${evidenceId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-teal-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-teal-400"), 2000);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        Loading investigation…
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Link
          href="/investigations"
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Investigations
        </Link>
        <Card className="border-rose-500/30">
          <CardContent className="p-6 flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">{error || "Investigation not found"}</p>
              <p className="text-xs text-rose-400/70 mt-1">
                The case may not exist or the backend may be unavailable.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inv = investigation;

  // Group evidence by type for the evidence section
  const staffEvidence = inv.evidence.filter(
    (e) => e.type === "temporal_staff_overlap"
  );
  const labEvidence = inv.evidence.filter(
    (e) =>
      e.type === "same_organism" ||
      e.type === "same_resistance_profile" ||
      e.type === "temporal_lab_proximity"
  );
  const otherEvidence = inv.evidence.filter(
    (e) =>
      !staffEvidence.includes(e) && !labEvidence.includes(e)
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Back nav */}
      <Link
        href="/investigations"
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Investigations
      </Link>

      {/* === HEADER === */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">
              {inv.case_id}
            </h1>
            <StatusBadge status={inv.status} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-300">
              <FlaskConical className="w-4 h-4 text-teal-400" />
              <em>{inv.organism}</em>
            </span>
            {inv.resistance_profile && (
              <span className="flex items-center gap-1.5 text-slate-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                {inv.resistance_profile}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed mt-2">
            {inv.summary}
          </p>
        </div>
        <ConfidenceGauge confidence={inv.confidence} />
      </div>

      {/* Warnings */}
      {inv.warnings.length > 0 && (
        <Card className="border-amber-500/20">
          <CardContent className="p-4 space-y-1">
            {inv.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-amber-300"
              >
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === SCORING === */}
      <ScoringBreakdownView scoring={inv.scoring} />

      {/* === TRANSMISSION GRAPH === */}
      <TransmissionGraph
        chains={inv.transmission_chains}
        onSelectEvidence={onSelectEvidence}
      />

      {/* === PATIENTS === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            Patients ({inv.patients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <PatientCard patient={inv.index_patient} />
            {inv.candidate_patients.map((p) => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === EVIDENCE === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Evidence ({inv.evidence.length} items)
          </CardTitle>
          <p className="text-xs text-slate-400">
            Each item represents an atomic, verifiable piece of epidemiological
            evidence. Staff contact hops are displayed separately to preserve
            provenance.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact / Temporal Evidence */}
          {staffEvidence.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">
                Contact Evidence
              </h3>
              <div className="space-y-3">
                {staffEvidence.map((e) => (
                  <div key={e.evidence_id} id={`evidence-${e.evidence_id}`} className="transition-all rounded-lg">
                    <EvidenceCard item={e} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Laboratory Evidence */}
          {labEvidence.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">
                Laboratory Evidence
              </h3>
              <div className="space-y-3">
                {labEvidence.map((e) => (
                  <div key={e.evidence_id} id={`evidence-${e.evidence_id}`} className="transition-all rounded-lg">
                    <EvidenceCard item={e} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Evidence */}
          {otherEvidence.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">
                Other Evidence
              </h3>
              <div className="space-y-3">
                {otherEvidence.map((e) => (
                  <div key={e.evidence_id} id={`evidence-${e.evidence_id}`} className="transition-all rounded-lg">
                    <EvidenceCard item={e} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === TIMELINE === */}
      <TimelineView entries={inv.timeline} />

      {/* === META === */}
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Clock className="w-3 h-3" />
        <span>
          Generated:{" "}
          {new Date(inv.generated_at).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
