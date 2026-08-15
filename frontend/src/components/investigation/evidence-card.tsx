"use client";

import type { EvidenceItem } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  evidenceTier,
  evidenceTypeLabel,
  tierBadgeVariant,
  tierReason,
  formatMinutes,
} from "@/lib/risk";
import { Clock, MapPin, User } from "lucide-react";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const label = evidenceTypeLabel(item.type);
  const tier = evidenceTier(item);

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {tierReason(item)}
          </p>
        </div>
        <Badge variant={tierBadgeVariant[tier]} size="tier" className="shrink-0">
          {tier}
        </Badge>
      </div>

      <p className="mt-2.5 text-[0.9375rem] leading-snug text-muted-foreground">
        {item.explanation}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
        {item.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </span>
        )}
        {item.overlap_minutes != null && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatMinutes(item.overlap_minutes)}
          </span>
        )}
        {item.mediator && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {item.mediator.name}
            {item.mediator.role ? ` (${item.mediator.role})` : ""}
          </span>
        )}
        {item.start_time && (
          <span className="tabular-nums">
            {formatDateTime(item.start_time)}
            {item.end_time ? ` → ${formatDateTime(item.end_time)}` : ""}
          </span>
        )}
      </div>

      {/* Provenance — kept, since atomic traceability is the point of the model */}
      {Object.keys(item.source_record_ids).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="text-eyebrow font-semibold uppercase text-muted-foreground/70">
            Source
          </span>
          <span className="font-mono text-[0.75rem] text-muted-foreground">
            {item.source}
          </span>
          {Object.entries(item.source_record_ids).map(([key, val]) => (
            <span
              key={key}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem] text-muted-foreground"
            >
              {key}: {String(val)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
