"use client";

import { AlertTriangle, ShieldAlert, Sparkles, Users } from "lucide-react";
import { PotentialClusterFinding } from "@/types/investigation";
import { getResistanceBadgeVariant } from "@/lib/formatters";

interface PotentialClusterCalloutProps {
  cluster: PotentialClusterFinding;
}

export function PotentialClusterCallout({ cluster }: PotentialClusterCalloutProps) {
  if (!cluster.hasCluster) return null;

  const resVariant = getResistanceBadgeVariant(cluster.resistance);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-rose-400/80 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/50 p-6 shadow-md transition-all">
      {/* Visual Accent Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-200/80">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white">
                PRIMARY SURVEILLANCE FINDING
              </span>
              <span className="text-xs font-bold text-rose-700">
                High-Confidence Cluster Alert
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
              Potential cluster requiring investigation
            </h2>
          </div>
        </div>

        {/* Confidence metric */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-rose-200 shadow-xs">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Confidence Score
            </div>
            <div className="text-xl font-black font-mono text-rose-600">
              {cluster.confidence}%
            </div>
          </div>
          <div className="size-2 rounded-full bg-rose-500 animate-ping" />
        </div>
      </div>

      {/* Outbreak Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
        {/* Organism & Strain */}
        <div className="bg-white/80 p-3.5 rounded-xl border border-rose-100 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">
            Pathogen & Profile
          </div>
          <div className="text-sm font-bold text-slate-900 italic">
            {cluster.organism}
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${resVariant.bg} ${resVariant.text} ${resVariant.border}`}
            >
              {cluster.resistance}
            </span>
            <span className="text-xs text-slate-600">Carbapenem-Resistant</span>
          </div>
        </div>

        {/* Connected Cases */}
        <div className="bg-white/80 p-3.5 rounded-xl border border-rose-100 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">
            Connected Positive Patients
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 flex items-center gap-2">
            <Users className="size-5 text-rose-600" />
            <span>{cluster.connectedPositivePatientsCount} Downstream Cases</span>
          </div>
          <div className="text-xs text-slate-600">
            Identical antibiogram match (General Medicine A)
          </div>
        </div>

        {/* Primary Vector Staff */}
        <div className="bg-white/80 p-3.5 rounded-xl border border-rose-100 shadow-xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-500">
            Identified Intermediary Vector
          </div>
          <div className="text-sm font-bold text-slate-900">
            {cluster.primaryVector?.name || "Nurse Anita Sharma"}
          </div>
          <div className="text-xs text-slate-600 truncate">
            {cluster.primaryVector?.role || "Staff Nurse (ICU → Gen Med A crossover)"}
          </div>
        </div>
      </div>

      {/* Key Evidence & Review Recommendation */}
      <div className="space-y-3 pt-2">
        <div className="bg-white/90 p-4 rounded-xl border border-rose-200/70 space-y-1.5">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-rose-600" />
            <span>Key Synthesis Evidence</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {cluster.keyEvidenceSummary}
          </p>
        </div>

        <div className="bg-rose-100/70 p-4 rounded-xl border border-rose-300 space-y-1">
          <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-rose-700" />
            <span>Infection Control Review Recommendation</span>
          </div>
          <p className="text-xs font-medium text-rose-950 leading-relaxed">
            {cluster.reviewRecommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
