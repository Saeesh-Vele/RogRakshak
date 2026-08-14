"use client";

import { FileSpreadsheet } from "lucide-react";
import { LabReport } from "@/types/patient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AstTable } from "./ast-table";
import { formatDateTime, getResistanceBadgeVariant } from "@/lib/formatters";

interface LabReportCardProps {
  report: LabReport;
}

export function LabReportCard({ report }: LabReportCardProps) {
  const resVariant = getResistanceBadgeVariant(report.resistanceProfile);

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <FileSpreadsheet className="size-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Microbiology Laboratory Report #{report.id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${resVariant.bg} ${resVariant.text} ${resVariant.border}`}
              >
                {report.resistanceProfile.toUpperCase()}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Specimen: <strong className="text-slate-700">{report.specimenType}</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 font-mono">
          <div>Reported: {formatDateTime(report.reportedAt)}</div>
          <div>Collected: {formatDateTime(report.collectedAt)}</div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Culture Isolation Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Isolated Organism
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Carbapenemase Resistant
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900 italic">
            {report.organism}
          </div>
          {report.cultureResult && (
            <p className="text-xs text-slate-600 mt-1 font-mono leading-relaxed">
              {report.cultureResult}
            </p>
          )}
        </div>

        {/* AST Susceptibility Table */}
        <AstTable sensitivities={report.antimicrobialSusceptibility} />
      </CardContent>
    </Card>
  );
}
