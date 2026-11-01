"use client";

import type { EvidenceItem, InvestigationCase, PatientSummary } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  aggregateTier,
  formatMinutes,
  tierBadgeVariant,
  type RiskTier,
} from "@/lib/risk";

const TIER_ORDER: Record<RiskTier, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

interface RankedContact {
  patient: PatientSummary;
  tier: RiskTier;
  totalOverlap: number;
  locations: string[];
  mediators: string[];
  items: number;
}

/**
 * Ranks candidate patients by the strength of their link to the index case.
 * Everything is read off the evidence array: tier from risk.ts, total overlap
 * from overlap_minutes, places from location, intermediaries from mediator.
 * No scoring of our own.
 */
function rankContacts(inv: InvestigationCase): RankedContact[] {
  const indexId = inv.index_patient.id;
  return inv.candidate_patients
    .map((patient) => {
      const linking: EvidenceItem[] = inv.evidence.filter((e) => {
        const pair = [e.subject_patient_id, e.object_patient_id];
        return pair.includes(indexId) && pair.includes(patient.id);
      });
      return {
        patient,
        tier: aggregateTier(linking),
        totalOverlap: linking.reduce((s, e) => s + (e.overlap_minutes ?? 0), 0),
        locations: Array.from(new Set(linking.map((e) => e.location).filter(Boolean) as string[])),
        mediators: Array.from(
          new Set(linking.map((e) => e.mediator?.name).filter(Boolean) as string[])
        ),
        items: linking.length,
      };
    })
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.totalOverlap - a.totalOverlap);
}

export function DiscoveredContacts({ investigation }: { investigation: InvestigationCase }) {
  const contacts = rankContacts(investigation);
  const max = Math.max(1, ...contacts.map((c) => c.totalOverlap));

  if (contacts.length === 0) {
    return <p className="py-6 text-ui text-muted-foreground">No candidate contacts identified.</p>;
  }

  return (
    <ol className="divide-hairline border-y border-border">
      {contacts.map((c, i) => {
        const high = c.tier === "HIGH";
        return (
          <li
            key={c.patient.id}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3.5"
          >
            <span className="pt-0.5 font-mono text-meta text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-ui font-medium text-foreground">{c.patient.name}</p>
              <p className="font-mono text-meta text-muted-foreground">{c.patient.mrn}</p>
              <div className="mt-2 flex items-center gap-2.5">
                <span aria-hidden className="h-1.5 flex-1 bg-sunken">
                  <span
                    className={high ? "block h-full bg-risk-high-foreground" : "block h-full bg-foreground/60"}
                    style={{ width: `${(c.totalOverlap / max) * 100}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 whitespace-nowrap text-right font-mono text-meta text-foreground">
                  {c.totalOverlap > 0 ? formatMinutes(c.totalOverlap) : "no overlap"}
                </span>
              </div>
              <p className="mt-1.5 text-meta text-muted-foreground">
                {[
                  c.mediators.length ? `via ${c.mediators.join(", ")}` : null,
                  c.locations.length ? c.locations.join(", ") : null,
                  `${c.items} linking item${c.items === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Badge variant={tierBadgeVariant[c.tier]} size="tier" className="pt-0.5">
              {c.tier}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}

