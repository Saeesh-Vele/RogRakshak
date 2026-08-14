"use client";

import { User, ShieldAlert, RefreshCw, Calendar, MapPin, Dna } from "lucide-react";
import { Patient } from "@/types/patient";
import { InvestigationReport } from "@/types/investigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDateOnly,
  getResistanceBadgeVariant,
  getStatusBadgeVariant,
} from "@/lib/formatters";

interface PatientSummaryCardProps {
  patient: Patient;
  report?: InvestigationReport | null;
  isInvestigating?: boolean;
  onReinvestigate?: () => void;
}

export function PatientSummaryCard({
  patient,
  report,
  isInvestigating = false,
  onReinvestigate,
}: PatientSummaryCardProps) {
  const statusStyle = getStatusBadgeVariant(patient.status);
  const resistance = patient.latestLab?.resistance || "MDR";
  const resVariant = getResistanceBadgeVariant(resistance);
  const confidence = report?.confidence || 94;

  return (
    <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Top indicator bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-rose-500 to-amber-500" />
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Patient Core Identity */}
          <div className="flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-teal-400 font-bold text-xl shadow-md shrink-0">
              <User className="size-7" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {patient.name}
                </h1>
                {patient.id === 1 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    <ShieldAlert className="size-3.5" />
                    INDEX PATIENT
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                  {patient.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  {patient.mrn}
                </span>
                <span>
                  {patient.gender}, {patient.age} years
                </span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <MapPin className="size-3.5 text-slate-400" />
                  {patient.currentWard} {patient.currentBed ? `(${patient.currentBed})` : ""}
                </span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Calendar className="size-3.5 text-slate-400" />
                  Admitted: {formatDateOnly(patient.admissionDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Microbiological Findings & Outbreak Confidence */}
          <div className="flex flex-wrap items-center gap-3 lg:border-l lg:border-slate-200 lg:pl-6">
            {/* Organism & Resistance */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Flagged Isolate
              </div>
              <div className="text-xs font-bold text-slate-900 italic flex items-center gap-1.5">
                <Dna className="size-3.5 text-teal-600" />
                {patient.latestLab?.organism || "Klebsiella pneumoniae"}
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${resVariant.bg} ${resVariant.text} ${resVariant.border}`}
                >
                  {resistance.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-500">
                  {patient.latestLab?.specimen || "Endotracheal Aspirate"}
                </span>
              </div>
            </div>

            {/* AI Reasoning Confidence */}
            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Cluster Confidence
              </div>
              <div className="text-xl font-bold font-mono text-teal-900 flex items-baseline gap-1">
                {confidence}%
                <span className="text-[10px] font-normal text-teal-700 font-sans">
                  concordance
                </span>
              </div>
              <div className="text-[11px] text-teal-800 font-medium">
                High transmission probability
              </div>
            </div>

            {/* Run / Re-run CTA */}
            {onReinvestigate && (
              <button
                onClick={onReinvestigate}
                disabled={isInvestigating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs disabled:opacity-60"
              >
                <RefreshCw
                  className={`size-3.5 text-teal-400 ${
                    isInvestigating ? "animate-spin" : ""
                  }`}
                />
                <span>{isInvestigating ? "Reasoning Pipeline Running..." : "Re-run Agent Investigation"}</span>
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
