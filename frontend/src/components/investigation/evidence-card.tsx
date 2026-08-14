"use client";

import type { EvidenceItem } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  User,
  FlaskConical,
  ShieldAlert,
  Link2,
  FileText,
} from "lucide-react";

const evidenceTypeLabels: Record<string, string> = {
  temporal_staff_overlap: "Staff Contact Overlap",
  patient_colocation: "Patient Co-location",
  shared_procedure_staff: "Shared Procedure Staff",
  same_organism: "Same Organism",
  same_resistance_profile: "Same Resistance Profile",
  temporal_lab_proximity: "Temporal Lab Proximity",
  shared_location: "Shared Location",
  clinical_timeline_relation: "Clinical Timeline Relation",
};

function EvidenceIcon({ type }: { type: string }) {
  switch (type) {
    case "temporal_staff_overlap":
    case "shared_procedure_staff":
      return <User className="w-4 h-4" />;
    case "patient_colocation":
    case "shared_location":
      return <MapPin className="w-4 h-4" />;
    case "same_organism":
      return <FlaskConical className="w-4 h-4" />;
    case "same_resistance_profile":
      return <ShieldAlert className="w-4 h-4" />;
    case "temporal_lab_proximity":
      return <Clock className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
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

interface EvidenceCardProps {
  item: EvidenceItem;
}

export function EvidenceCard({ item }: EvidenceCardProps) {
  const label = evidenceTypeLabels[item.type] ?? item.type;
  const strengthPct = Math.round(item.strength * 100);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-800 text-teal-400">
            <EvidenceIcon type={item.type} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <Badge variant="outline" className="ml-2 text-[10px]">
              {item.source}
            </Badge>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
          {strengthPct}% strength
        </span>
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-300 leading-relaxed">
        {item.explanation}
      </p>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {item.location && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span>{item.location}</span>
          </div>
        )}
        {item.overlap_minutes != null && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{item.overlap_minutes} minutes</span>
          </div>
        )}
        {item.start_time && (
          <div className="text-slate-500">
            Start: {formatDateTime(item.start_time)}
          </div>
        )}
        {item.end_time && (
          <div className="text-slate-500">
            End: {formatDateTime(item.end_time)}
          </div>
        )}
        {item.mediator && (
          <div className="flex items-center gap-1.5 text-slate-400 col-span-2">
            <User className="w-3 h-3 text-slate-500" />
            <span>
              {item.mediator.name}
              {item.mediator.role ? ` (${item.mediator.role})` : ""}
            </span>
          </div>
        )}
        {item.event_id && (
          <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
            <Link2 className="w-3 h-3" />
            <span className="font-mono text-[10px] truncate">
              {item.event_id}
            </span>
          </div>
        )}
      </div>

      {/* Provenance */}
      {Object.keys(item.source_record_ids).length > 0 && (
        <div className="pt-1 border-t border-slate-800">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide">
            Provenance
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(item.source_record_ids).map(([key, val]) => (
              <span
                key={key}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono"
              >
                {key}: {String(val)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
