"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { useInvestigationStore } from "@/stores/investigation-store";
import { apiClient } from "@/lib/api-client";
import { Patient } from "@/types/patient";
import { PatientSummaryCard } from "@/components/investigation/patient-summary-card";
import { AgentStepper } from "@/components/investigation/agent-stepper";
import { PotentialClusterCallout } from "@/components/investigation/potential-cluster-callout";
import { PatientTimeline } from "@/components/timeline/patient-timeline";
import { ContactGraph } from "@/components/graph/contact-graph";
import { EvidencePanel } from "@/components/investigation/evidence-panel";
import { RankedContactsTable } from "@/components/investigation/ranked-contacts-table";
import { RecommendedActions } from "@/components/investigation/recommended-actions";

export default function InvestigatePatientPage() {
  const params = useParams();
  const patientIdParam = Number(params?.patientId) || 1;

  const [patient, setPatient] = useState<Patient | null>(null);

  const {
    patientId,
    status,
    agents,
    timeline,
    graph,
    evidence,
    contacts,
    report,
    startInvestigation,
  } = useInvestigationStore();

  // Load patient details & auto-start investigation if new patient
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await apiClient.getPatientById(patientIdParam);
        if (res && res.patient && isMounted) {
          setPatient(res.patient);
        }
      } catch (err) {
        console.error("Failed to load patient:", err);
      }
    }

    load();

    // If store has not investigated this patient, trigger investigation
    if (patientId !== patientIdParam || status === "idle") {
      startInvestigation(patientIdParam);
    }

    return () => {
      isMounted = false;
    };
  }, [patientIdParam, startInvestigation, patientId, status]);

  const handleReinvestigate = () => {
    startInvestigation(patientIdParam);
  };

  const isInvestigating = status === "investigating";

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                Live Outbreak Investigation
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <Sparkles className="size-3" /> LangGraph Multi-Agent
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconstructing transmission vectors, temporal overlaps, and clinical evidence trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReinvestigate}
            disabled={isInvestigating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isInvestigating ? "animate-spin" : ""}`} />
            <span>Re-run Stream</span>
          </button>
        </div>
      </div>

      {/* Patient Summary Header */}
      {patient && (
        <PatientSummaryCard
          patient={patient}
          report={report}
          isInvestigating={isInvestigating}
          onReinvestigate={handleReinvestigate}
        />
      )}

      {/* Main Investigation Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Multi-Agent Progress Stepper (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <AgentStepper
            agents={agents}
            overallStatus={status}
          />
        </div>

        {/* Right Main Body: Findings, Graph, Timeline, Evidence (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Primary AHA Moment: Potential Cluster Callout */}
          {report?.clusterFinding && (
            <PotentialClusterCallout cluster={report.clusterFinding} />
          )}

          {/* Temporal Co-Location Gantt Timeline */}
          <PatientTimeline spans={timeline} />

          {/* Temporal Contact Graph */}
          <ContactGraph graphData={graph} height="400px" />

          {/* Evidence Panel */}
          <EvidencePanel evidenceList={evidence} />

          {/* Ranked Contacts Table */}
          <RankedContactsTable contacts={contacts} />

          {/* Recommended Infection Control Interventions */}
          {report?.recommendations && (
            <RecommendedActions actions={report.recommendations} />
          )}
        </div>
      </div>
    </div>
  );
}
