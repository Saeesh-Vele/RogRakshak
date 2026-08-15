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
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

const TIER_ORDER: Record<RiskTier, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const TIER_DOT: Record<RiskTier, string> = {
  HIGH:   "bg-risk-high-foreground",
  MEDIUM: "bg-[hsl(30_82%_50%)]",
  LOW:    "bg-muted-foreground",
};

interface RankedContact {
  patient: PatientSummary;
  tier: RiskTier;
  totalOverlap: number;
  detail: string;
}

function rankContacts(inv: InvestigationCase): RankedContact[] {
  const indexId = inv.index_patient.id;

  return inv.candidate_patients
    .map((patient) => {
      const linking: EvidenceItem[] = inv.evidence.filter((e) => {
        const pair = [e.subject_patient_id, e.object_patient_id];
        return pair.includes(indexId) && pair.includes(patient.id);
      });

      const totalOverlap = linking.reduce((sum, e) => sum + (e.overlap_minutes ?? 0), 0);

      const locations = Array.from(
        new Set(linking.map((e) => e.location).filter(Boolean) as string[])
      );

      const parts: string[] = [];
      if (locations.length === 1) parts.push(`Shared ${locations[0]}`);
      else if (locations.length > 1) parts.push(`${locations.length} shared locations`);
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
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.totalOverlap - a.totalOverlap
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
      <CardHeader className="pb-3">
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
        <div className="border-t border-border">
          {contacts.map(({ patient, tier, detail }) => (
            <div
              key={patient.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-100 hover:bg-muted/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Avatar */}
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    tier === "HIGH"   && "bg-risk-high text-risk-high-foreground",
                    tier === "MEDIUM" && "bg-risk-medium text-risk-medium-foreground",
                    tier === "LOW"    && "bg-muted text-muted-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{patient.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{detail}</p>
                  <p className="mt-0.5 font-mono text-[0.75rem] text-muted-foreground/60">
                    {patient.mrn}
                  </p>
                </div>
              </div>
              <Badge variant={tierBadgeVariant[tier]} size="tier" className="shrink-0">
                <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TIER_DOT[tier])} />
                {tier}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
