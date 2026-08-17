/**
 * Dashboard metric derivation.
 *
 * Everything here is computed from the investigation list the API already
 * returns — there is no metrics/analytics endpoint, and nothing is synthesised.
 * Where the reference design assumed a figure we cannot source, the metric is
 * reframed to what the data genuinely supports rather than invented.
 */

import type { InvestigationCase } from "@/types/api";
import { evidenceTier } from "@/lib/risk";

export interface DashboardMetrics {
  activeCases: number;
  casesThisWeek: number;
  highRiskContacts: number;
  highRiskLinks: number;
  potentialClusters: number;
  highPriorityCount: number;
  flaggedLocations: number;
  topLocation: string | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function deriveMetrics(cases: InvestigationCase[]): DashboardMetrics {
  const now = Date.now();

  const casesThisWeek = cases.filter(
    (c) => now - new Date(c.generated_at).getTime() <= WEEK_MS
  ).length;

  // Distinct non-index patients implicated across every case
  const contactIds = new Set<number>();
  for (const c of cases) {
    for (const p of c.candidate_patients) contactIds.add(p.id);
  }

  // Distinct patients linked by at least one HIGH-tier piece of evidence
  const highRiskIds = new Set<number>();
  for (const c of cases) {
    for (const e of c.evidence) {
      if (evidenceTier(e) === "HIGH") {
        if (e.object_patient_id !== c.index_patient.id) {
          highRiskIds.add(e.object_patient_id);
        }
        if (e.subject_patient_id !== c.index_patient.id) {
          highRiskIds.add(e.subject_patient_id);
        }
      }
    }
  }

  const potentialClusters = cases.filter(
    (c) =>
      c.status === "SUSPECTED_CLUSTER" ||
      c.status === "HIGH_PRIORITY_INVESTIGATION"
  ).length;

  const highPriorityCount = cases.filter(
    (c) => c.status === "HIGH_PRIORITY_INVESTIGATION"
  ).length;

  // Locations that appear in contact evidence
  const locationCounts = new Map<string, number>();
  for (const c of cases) {
    for (const e of c.evidence) {
      if (e.location) {
        locationCounts.set(e.location, (locationCounts.get(e.location) ?? 0) + 1);
      }
    }
  }
  const topLocation =
    Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  return {
    activeCases: cases.length,
    casesThisWeek,
    highRiskContacts: contactIds.size,
    highRiskLinks: highRiskIds.size,
    potentialClusters,
    highPriorityCount,
    flaggedLocations: locationCounts.size,
    topLocation,
  };
}

export interface FlaggedLocation {
  name: string;
  evidenceCount: number;
  caseIds: string[];
  tier: "HIGH" | "MEDIUM";
}

/**
 * Locations ranked by how much contact evidence implicates them.
 * Tier reflects whether any HIGH-tier evidence occurred there — not a
 * review/triage state, which the backend does not model.
 */
export function deriveFlaggedLocations(
  cases: InvestigationCase[]
): FlaggedLocation[] {
  const map = new Map<
    string,
    { count: number; caseIds: Set<string>; high: boolean }
  >();

  for (const c of cases) {
    for (const e of c.evidence) {
      if (!e.location) continue;
      const entry = map.get(e.location) ?? {
        count: 0,
        caseIds: new Set<string>(),
        high: false,
      };
      entry.count += 1;
      entry.caseIds.add(c.case_id);
      if (evidenceTier(e) === "HIGH") entry.high = true;
      map.set(e.location, entry);
    }
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      evidenceCount: v.count,
      caseIds: Array.from(v.caseIds),
      tier: (v.high ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
    }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount);
}

/**
 * Earliest recorded clinical event for a case — "when did this actually start",
 * as opposed to `generated_at`, which is only when the workflow was run.
 *
 * The list endpoint already returns each case's full `timeline`, so this needs
 * no extra request per row. Falls back to `generated_at` for a case whose
 * timeline came back empty.
 */
export function caseStartedAt(c: InvestigationCase): {
  iso: string;
  isFallback: boolean;
} {
  let earliest: string | null = null;
  for (const entry of c.timeline) {
    if (earliest === null || entry.timestamp < earliest) earliest = entry.timestamp;
  }
  return earliest === null
    ? { iso: c.generated_at, isFallback: true }
    : { iso: earliest, isFallback: false };
}

export interface TrendPoint {
  date: string;
  label: string;
  /** New confirmed positives recorded on this day — the epi curve bars. */
  count: number;
  cumulative: number;
}

/**
 * Confirmed positive cultures per day, with a running total.
 *
 * Sourced from `PatientSummary.positive_culture_date`, the only real
 * time-series the API exposes — there is no trend/analytics endpoint. Patients
 * without a recorded culture date are excluded rather than back-filled.
 */
export function deriveTrend(cases: InvestigationCase[]): TrendPoint[] {
  const dates: string[] = [];
  const seen = new Set<number>();

  for (const c of cases) {
    for (const p of [c.index_patient, ...c.candidate_patients, ...c.patients]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      if (p.positive_culture_date) dates.push(p.positive_culture_date.slice(0, 10));
    }
  }

  if (dates.length === 0) return [];

  dates.sort();
  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);

  // Pad by a day either side so the curve does not start hard against the axis
  first.setUTCDate(first.getUTCDate() - 1);
  last.setUTCDate(last.getUTCDate() + 1);

  const perDay = new Map<string, number>();
  for (const d of dates) perDay.set(d, (perDay.get(d) ?? 0) + 1);

  const points: TrendPoint[] = [];
  let running = 0;
  for (
    let d = new Date(first);
    d <= last;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const key = d.toISOString().slice(0, 10);
    const count = perDay.get(key) ?? 0;
    running += count;
    points.push({
      date: key,
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
      count,
      cumulative: running,
    });
  }

  return points;
}
