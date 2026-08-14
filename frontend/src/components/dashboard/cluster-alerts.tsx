"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { DashboardSummary } from "@/types/api";

interface ClusterAlertsProps {
  summary: DashboardSummary;
}

export function ClusterAlerts({ summary }: ClusterAlertsProps) {
  if (summary.potentialClustersCount === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/70 to-amber-50/50 p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                CRITICAL SURVEILLANCE ALERT
              </span>
              <span className="text-xs text-rose-700 font-medium">
                Planted Outbreak Scenario Detected
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              Potential Cluster Requiring Investigation: ICU to General Medicine A
            </h4>
            <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
              <strong>3 downstream patients</strong> in General Medicine A share identical{" "}
              <span className="italic font-semibold">Klebsiella pneumoniae (MDR)</span> phenotypic resistance with{" "}
              <strong>Index Patient Rajesh Verma</strong>. Intermediary staff vector crossover detected.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/investigate/1"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs group"
          >
            <Sparkles className="size-3.5 text-rose-200" />
            <span>Launch Outbreak Investigation</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
