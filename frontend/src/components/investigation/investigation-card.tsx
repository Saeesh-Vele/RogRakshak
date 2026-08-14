"use client";

import Link from "next/link";
import type { InvestigationCase } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { FlaskConical, Users, Clock } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

interface InvestigationCardProps {
  investigation: InvestigationCase;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const pct = Math.round(investigation.confidence * 100);

  return (
    <Link href={`/investigations/${investigation.case_id}`}>
      <Card className="cursor-pointer hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-teal-900/10 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-teal-400">
                  {investigation.case_id}
                </span>
                <StatusBadge status={investigation.status} />
              </div>
              <p className="text-sm text-slate-200 font-medium truncate">
                {investigation.organism}
                {investigation.resistance_profile && (
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    ({investigation.resistance_profile})
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-slate-100">{pct}%</div>
              <div className="text-[10px] text-slate-500 uppercase">
                Confidence
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              Index: {investigation.index_patient.name}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {investigation.candidate_patients.length} candidate
              {investigation.candidate_patients.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(investigation.generated_at)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
