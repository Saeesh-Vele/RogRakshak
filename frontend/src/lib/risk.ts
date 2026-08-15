/**
 * Risk tiering for evidence items.
 *
 * Why not tier on `strength` directly: every item the backend emits scores
 * between 0.85 and 0.95, so any absolute threshold collapses to a single tier
 * and the pills stop carrying information. Instead we tier on what the evidence
 * *is* — a direct contact link weighted by how long the overlap lasted beats a
 * corroborating attribute match.
 *
 * Presentation only. No API contract is affected.
 */

import type { EvidenceItem, EvidenceType } from "@/types/api";

export type RiskTier = "HIGH" | "MEDIUM" | "LOW";

/** Evidence types that place two people in the same place at the same time. */
const CONTACT_TYPES: ReadonlySet<EvidenceType> = new Set<EvidenceType>([
  "temporal_staff_overlap",
  "patient_colocation",
  "shared_procedure_staff",
]);

/** Types that establish timing proximity but not direct contact. */
const PROXIMITY_TYPES: ReadonlySet<EvidenceType> = new Set<EvidenceType>([
  "temporal_lab_proximity",
  "clinical_timeline_relation",
]);

const HIGH_OVERLAP_MINUTES = 240; // 4h+ shared exposure
const MEDIUM_OVERLAP_MINUTES = 30;

export function evidenceTier(item: EvidenceItem): RiskTier {
  if (CONTACT_TYPES.has(item.type)) {
    const overlap = item.overlap_minutes ?? 0;
    if (overlap >= HIGH_OVERLAP_MINUTES) return "HIGH";
    if (overlap >= MEDIUM_OVERLAP_MINUTES) return "MEDIUM";
    return "LOW";
  }
  if (PROXIMITY_TYPES.has(item.type)) return "MEDIUM";
  // same_organism / same_resistance_profile / shared_location corroborate a
  // link but do not establish one on their own.
  return "LOW";
}

/** Highest tier among a set of evidence items, or LOW when there is none. */
export function aggregateTier(items: EvidenceItem[]): RiskTier {
  let best: RiskTier = "LOW";
  for (const item of items) {
    const tier = evidenceTier(item);
    if (tier === "HIGH") return "HIGH";
    if (tier === "MEDIUM") best = "MEDIUM";
  }
  return best;
}

export const tierBadgeVariant = {
  HIGH: "riskHigh",
  MEDIUM: "riskMedium",
  LOW: "riskLow",
} as const;

/** Human-readable reason for a tier, used as pill subtext. */
export function tierReason(item: EvidenceItem): string {
  if (CONTACT_TYPES.has(item.type)) {
    const overlap = item.overlap_minutes;
    if (overlap == null) return "Contact link, duration unknown";
    return `${formatMinutes(overlap)} overlap`;
  }
  if (PROXIMITY_TYPES.has(item.type)) return "Timing proximity";
  return "Corroborating match";
}

/** Full display names for evidence types, used in evidence cards. */
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  temporal_staff_overlap: "Staff Contact Overlap",
  patient_colocation: "Patient Co-location",
  shared_procedure_staff: "Shared Procedure Staff",
  same_organism: "Same Organism",
  same_resistance_profile: "Same Resistance Profile",
  temporal_lab_proximity: "Temporal Lab Proximity",
  shared_location: "Shared Location",
  clinical_timeline_relation: "Clinical Timeline Relation",
};

/** Compact variants for graph edge pills, where space is tight. */
export const EVIDENCE_TYPE_SHORT_LABELS: Record<EvidenceType, string> = {
  temporal_staff_overlap: "Staff contact",
  patient_colocation: "Co-location",
  shared_procedure_staff: "Shared procedure",
  same_organism: "Same organism",
  same_resistance_profile: "Same resistance",
  temporal_lab_proximity: "Lab proximity",
  shared_location: "Shared location",
  clinical_timeline_relation: "Timeline relation",
};

export function evidenceTypeLabel(type: EvidenceType, short = false): string {
  const map = short ? EVIDENCE_TYPE_SHORT_LABELS : EVIDENCE_TYPE_LABELS;
  return map[type] ?? type;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) {
    const whole = Math.floor(hours);
    const rem = Math.round(minutes - whole * 60);
    return rem ? `${whole}h ${rem}m` : `${whole}h`;
  }
  const wholeDays = Math.floor(hours / 24);
  const remHours = Math.round(hours - wholeDays * 24);
  return remHours ? `${wholeDays}d ${remHours}h` : `${wholeDays}d`;
}
