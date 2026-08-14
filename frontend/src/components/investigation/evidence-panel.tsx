"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileSpreadsheet,
  Clock,
  Dna,
  Building2,
  Stethoscope,
  Info,
} from "lucide-react";
import { InvestigationEvidenceItem } from "@/types/investigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EvidencePanelProps {
  evidenceList: InvestigationEvidenceItem[];
  onSelect?: (id: string) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Staff Overlap": Clock,
  "Organism Profile": Dna,
  "Ward Co-location": Building2,
  "Device Exposure": Stethoscope,
  "Lab Result": FileSpreadsheet,
};

export function EvidencePanel({ evidenceList, onSelect }: EvidencePanelProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    "ev-01": true,
    "ev-02": true,
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    onSelect?.(id);
  };

  if (!evidenceList || evidenceList.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-center text-slate-500 text-xs">
          Investigation evidence will populate as the reasoning pipeline completes stages.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="size-4 text-teal-600" />
            <span>Clinical Evidence & Data Provenance</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of movement logs, AST profiles, and temporal overlap computations
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {evidenceList.length} items verified
        </span>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {evidenceList.map((item) => {
          const isExpanded = expandedIds[item.id] ?? false;
          const Icon = categoryIcons[item.category] || Info;

          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-teal-300 bg-teal-50/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {/* Header item */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full p-3.5 flex items-start justify-between text-left gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5 border border-slate-200">
                    <Icon className="size-4 text-teal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-teal-700">
                        {item.confidence}% confidence
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-teal-700" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </div>
              </button>

              {/* Expandable Details Grid */}
              {isExpanded && (
                <div className="p-3.5 pt-0 border-t border-slate-100 mt-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200/80">
                    {Object.entries(item.details).map(([key, val]) => (
                      <div key={key} className="space-y-0.5 text-xs">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="font-medium text-slate-800 break-words">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Provenance source badge */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <strong>Source:</strong> {item.source}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
