"use client";

import type { EvidenceItem, InvestigationCase, PatientSummary } from "@/types/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  aggregateTier,
  evidenceTier,
  formatMinutes,
  tierBadgeVariant,
  type RiskTier,
} from "@/lib/risk";

const TIER_ORDER: Record<RiskTier, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

interface RankedContact {
  patient: PatientSummary;
  tier: RiskTier;
  totalOverlap: number;
  detail: string;
}

/**
 * Ranks candidate patients by the strength of their link to the index case.
 *
 * Everything shown is read off the evidence array: the tier comes from
 * `risk.ts`, the overlap total from `overlap_minutes`, and the location from
 * whichever place contributed the most contact evidence. No scoring of our own.
 */
function rankContacts(inv: InvestigationCase): RankedContact[] {
  const indexId = inv.index_patient.id;

  return inv.candidate_patients
    .map((patient) => {
      const linking: EvidenceItem[] = inv.evidence.filter((e) => {
        const pair = [e.subject_patient_id, e.object_patient_id];
        return pair.includes(indexId) && pair.includes(patient.id);
      });

      const totalOverlap = linking.reduce(
        (sum, e) => sum + (e.overlap_minutes ?? 0),
        0
      );

      // Shared locations behind the link. Several are common, and picking a
      // single "top" one would break ties arbitrarily and misreport the link.
      const locations = Array.from(
        new Set(linking.map((e) => e.location).filter(Boolean) as string[])
      );

      const parts: string[] = [];
      if (locations.length === 1) parts.push(`Shared ${locations[0]}`);
      else if (locations.length > 1)
        parts.push(`${locations.length} shared locations`);
      if (totalOverlap > 0) parts.push(`${formatMinutes(totalOverlap)} overlap`);
      if (parts.length === 0) {
        const hasContact = linking.some((e) => evidenceTier(e) !== "LOW");
        parts.push(
          hasContact
            ? `${linking.length} linking item${linking.length !== 1 ? "s" : ""}`
            : "Attribute match only · no recorded overlap"
        );
      }

      return {
        patient,
        tier: aggregateTier(linking),
        totalOverlap,
        detail: parts.join(" · "),
      };
    })
    .sort(
      (a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
        b.totalOverlap - a.totalOverlap
    );
}

export function DiscoveredContacts({
  investigation,
}: {
  investigation: InvestigationCase;
}) {
  const contacts = rankContacts(investigation);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>Discovered Contacts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranked by temporal overlap with the index case
        </p>
      </CardHeader>

      {contacts.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">
          No candidate contacts identified.
        </p>
      ) : (
        <div className="divide-hairline border-t border-border">
          {contacts.map(({ patient, tier, detail }) => (
            <div
              key={patient.id}
              className="flex items-start justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{patient.name}</p>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                  {detail}
                </p>
                <p className="mt-0.5 font-mono text-[0.75rem] text-muted-foreground/70">
                  {patient.mrn}
                </p>
              </div>
              <Badge variant={tierBadgeVariant[tier]} size="tier" className="shrink-0">
                {tier}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
