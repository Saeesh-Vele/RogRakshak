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
import { cn } from "@/lib/utils";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIER_BORDER: Record<string, string> = {
  HIGH:   "border-l-risk-high-foreground",
  MEDIUM: "border-l-[hsl(30_82%_50%)]",
  LOW:    "border-l-border",
};

const TIER_BADGE_DOT: Record<string, string> = {
  HIGH:   "bg-risk-high-foreground",
  MEDIUM: "bg-[hsl(30_82%_50%)]",
  LOW:    "bg-muted-foreground",
};

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const label = evidenceTypeLabel(item.type);
  const tier  = evidenceTier(item);

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 bg-card p-4 transition-all duration-150",
        "hover:border-primary/20 hover:shadow-card",
        TIER_BORDER[tier] ?? "border-l-border"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {tierReason(item)}
          </p>
        </div>
        <Badge variant={tierBadgeVariant[tier]} size="tier" className="shrink-0">
          <span
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full", TIER_BADGE_DOT[tier])}
          />
          {tier}
        </Badge>
      </div>

      {/* Explanation */}
      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-muted-foreground">
        {item.explanation}
      </p>

      {/* Metadata chips */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
        {item.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {item.location}
          </span>
        )}
        {item.overlap_minutes != null && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {formatMinutes(item.overlap_minutes)}
          </span>
        )}
        {item.mediator && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {item.mediator.name}
            {item.mediator.role ? ` · ${item.mediator.role}` : ""}
          </span>
        )}
        {item.start_time && (
          <span className="font-mono tabular-nums text-[0.8125rem]">
            {formatDateTime(item.start_time)}
            {item.end_time ? ` → ${formatDateTime(item.end_time)}` : ""}
          </span>
        )}
      </div>

      {/* Provenance */}
      {Object.keys(item.source_record_ids).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
