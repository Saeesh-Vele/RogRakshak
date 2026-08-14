"use client";

import { AntimicrobialSensitivity } from "@/types/patient";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dna, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface AstTableProps {
  sensitivities?: AntimicrobialSensitivity[];
}

export function AstTable({ sensitivities }: AstTableProps) {
  if (!sensitivities || sensitivities.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No antimicrobial susceptibility testing (AST) panel available for this report.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="size-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Antimicrobial Susceptibility Testing (AST) Panel
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {sensitivities.length} Agents Tested (CLSI / EUCAST Breakpoints)
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Antimicrobial Agent</TableHead>
            <TableHead>Susceptibility Result</TableHead>
            <TableHead>Minimum Inhibitory Concentration (MIC)</TableHead>
            <TableHead className="text-right">Interpretation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sensitivities.map((item, index) => {
            const isResistant =
              item.result.includes("Resistant") || item.interp === "R";
            const isIntermediate =
              item.result.includes("Intermediate") || item.interp === "I";
            const isSusceptible =
              item.result.includes("Susceptible") || item.interp === "S";

            return (
              <TableRow
                key={index}
                className={
                  isResistant
                    ? "bg-rose-50/30 hover:bg-rose-50/50"
                    : isIntermediate
                    ? "bg-amber-50/30 hover:bg-amber-50/50"
                    : "hover:bg-slate-50"
                }
              >
                {/* Agent Name */}
                <TableCell className="font-semibold text-xs text-slate-900">
                  {item.antibiotic}
                </TableCell>

                {/* Result */}
                <TableCell className="text-xs font-medium text-slate-700">
                  {item.result}
                </TableCell>

                {/* MIC */}
                <TableCell className="text-xs font-mono font-semibold text-slate-800">
                  {item.mic || "—"}
                </TableCell>

                {/* Interpretation Badge */}
                <TableCell className="text-right">
                  {isResistant && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <ShieldAlert className="size-3 text-rose-600" />
                      Resistant (R)
                    </span>
                  )}
                  {isIntermediate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="size-3 text-amber-600" />
                      Intermediate (I)
                    </span>
                  )}
                  {isSusceptible && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Susceptible (S)
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
