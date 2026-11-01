/**
 * Dashboard metric derivation.
 *
 * Everything here is computed from the investigation list the API already
 * returns. There is no metrics or analytics endpoint and nothing is
 * synthesised: a figure that the data cannot support is left out rather than
 * approximated.
 */

import type { InvestigationCase, InvestigationStatus } from "@/types/api";
import { evidenceTier, type RiskTier } from "@/lib/risk";

export interface DashboardSummary {
  caseCount: number;
  byStatus: Partial<Record<InvestigationStatus, number>>;
  /** Distinct patients with a recorded positive culture, across all cases. */
  positivePatients: number;
  firstPositive: string | null;
  lastPositive: string | null;
  /** Distinct patients appearing in any case, as index or candidate. */
  patientsInvolved: number;
  /** Distinct non-index patients linked to a case's index by HIGH-tier evidence. */
  highTierPatients: number;
  wardCount: number;
}

/** Every patient's culture date, from whichever record in any case carries it. */
function cultureDates(cases: InvestigationCase[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const c of cases) {
    // index_patient is built from the timeline and has no culture date; the
    // same patient's entry in `patients` does. Take the date from any record.
    for (const p of [c.index_patient, ...c.patients, ...c.candidate_patients]) {
      if (p.positive_culture_date && !out.has(p.id)) out.set(p.id, p.positive_culture_date);
    }
  }
  return out;
}

export function deriveSummary(cases: InvestigationCase[]): DashboardSummary {
  const byStatus: DashboardSummary["byStatus"] = {};
  const involved = new Set<number>();
  const highTier = new Set<number>();
  const wards = new Set<string>();

  for (const c of cases) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    involved.add(c.index_patient.id);
    for (const p of c.candidate_patients) involved.add(p.id);
    for (const e of c.evidence) {
      if (e.location) wards.add(e.location);
      if (evidenceTier(e) !== "HIGH") continue;
      for (const id of [e.subject_patient_id, e.object_patient_id]) {
        if (id !== c.index_patient.id) highTier.add(id);
      }
    }
  }

  const dates = Array.from(cultureDates(cases).values()).sort();
  return {
    caseCount: cases.length,
    byStatus,
    positivePatients: dates.length,
    firstPositive: dates[0] ?? null,
    lastPositive: dates[dates.length - 1] ?? null,
    patientsInvolved: involved.size,
    highTierPatients: highTier.size,
    wardCount: wards.size,
  };
}

export interface WardRisk {
  name: string;
  counts: Record<RiskTier, number>;
  total: number;
  caseIds: string[];
}

/**
 * Contact evidence per ward, split by tier. Only evidence that records a
 * location counts (lab-derived items carry none), so these totals are the
 * contact links observed on each ward.
 */
export function deriveWardRisk(cases: InvestigationCase[]): WardRisk[] {
  const map = new Map<string, { counts: Record<RiskTier, number>; cases: Set<string> }>();
  for (const c of cases) {
    for (const e of c.evidence) {
      if (!e.location) continue;
      const w = map.get(e.location) ?? {
        counts: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        cases: new Set<string>(),
      };
      w.counts[evidenceTier(e)] += 1;
      w.cases.add(c.case_id);
      map.set(e.location, w);
    }
  }
  return Array.from(map.entries())
    .map(([name, w]) => ({
      name,
      counts: w.counts,
      total: w.counts.HIGH + w.counts.MEDIUM + w.counts.LOW,
      caseIds: Array.from(w.cases).sort(),
    }))
    .sort((a, b) => b.counts.HIGH - a.counts.HIGH || b.total - a.total);
}

/**
 * Earliest recorded clinical event for a case — "when did this actually start",
 * as opposed to `generated_at`, which is only when the workflow was run.
 * Falls back to `generated_at` for a case whose timeline came back empty.
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
  /** New confirmed positives recorded on this day. */
  count: number;
  cumulative: number;
}

/**
 * Confirmed positive cultures per calendar day, from the first positive to the
 * last, with a running total. Days in between with no positive are real zeros;
 * nothing is added before the first or after the last.
 *
 * Sourced from PatientSummary.positive_culture_date — the only real time series
 * the API exposes. Each patient is counted once.
 */
export function deriveTrend(cases: InvestigationCase[]): TrendPoint[] {
  const dates = Array.from(cultureDates(cases).values())
    .map((d) => d.slice(0, 10))
    .sort();
  if (dates.length === 0) return [];

  const perDay = new Map<string, number>();
  for (const d of dates) perDay.set(d, (perDay.get(d) ?? 0) + 1);

  const points: TrendPoint[] = [];
  let running = 0;
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  for (
    let d = new Date(`${dates[0]}T00:00:00Z`);
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
