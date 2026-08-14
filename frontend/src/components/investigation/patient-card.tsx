"use client";

import type { PatientSummary } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Stethoscope, FlaskConical } from "lucide-react";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface PatientCardProps {
  patient: PatientSummary;
}

export function PatientCard({ patient }: PatientCardProps) {
  const roleVariant =
    patient.role === "index"
      ? "cluster"
      : patient.role === "candidate"
      ? "potential"
      : "noSignal";
  const roleLabel =
    patient.role === "index"
      ? "Index Case"
      : patient.role === "candidate"
      ? "Candidate"
      : "Control";

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-slate-800 text-teal-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">{patient.name}</p>
            <p className="text-xs text-slate-500 font-mono">{patient.mrn}</p>
          </div>
        </div>
        <Badge variant={roleVariant}>{roleLabel}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-slate-500" />
          Admitted: {formatDate(patient.admission_date)}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-slate-500" />
          Discharged: {formatDate(patient.discharge_date)}
        </div>
        {patient.admitting_diagnosis && (
          <div className="flex items-center gap-1.5 col-span-2">
            <Stethoscope className="w-3 h-3 text-slate-500" />
            {patient.admitting_diagnosis}
          </div>
        )}
        {patient.positive_culture_date && (
          <div className="flex items-center gap-1.5 col-span-2">
            <FlaskConical className="w-3 h-3 text-slate-500" />
            Culture: {formatDate(patient.positive_culture_date)}
          </div>
        )}
      </div>
    </div>
  );
}
