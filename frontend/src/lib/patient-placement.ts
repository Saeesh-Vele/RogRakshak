/**
 * Ward / bed placement for graph nodes.
 *
 * The investigation payload has no ward or bed on PatientSummary, so this is
 * read from /graph/patient/{id}/timeline movement events, which carry
 * details.location_type ("ward" | "bed") and details.location_name.
 *
 * Fetches are parallel and individually fault-tolerant: a patient whose
 * timeline fails simply has no placement line on their card. Nothing is
 * guessed or back-filled.
 */

import { graphApi } from "@/lib/api-client";
import type { PatientPlacement, PatientTimelineResponse } from "@/types/api";

/**
 * Admitting ward and bed — the *earliest* movement, not the latest.
 *
 * This matters: the index patient starts in the ICU (where the exposure
 * evidence sits) and later transfers to a Surgical Ward before discharge.
 * Taking the latest movement would label the outbreak's origin node with the
 * ward it ended in, which misrepresents where transmission occurred.
 */
export function placementFromTimeline(
  timeline: PatientTimelineResponse
): PatientPlacement {
  let ward: { name: string; at: number } | null = null;
  let bed: { name: string; at: number } | null = null;

  for (const event of timeline.events) {
    if (event.event_type !== "movement") continue;
    const details = event.details;
    const name = details?.location_name;
    if (!name) continue;

    const at = new Date(event.timestamp).getTime();
    if (details?.location_type === "ward") {
      if (!ward || at < ward.at) ward = { name, at };
    } else if (details?.location_type === "bed") {
      if (!bed || at < bed.at) bed = { name, at };
    }
  }

  return { ward: ward?.name ?? null, bed: bed?.name ?? null };
}

/** Trims "Bed GEN-BED-01" down to "Bed 01" for display, else returns as-is. */
export function shortBedLabel(bed: string | null | undefined): string | null {
  if (!bed) return null;
  const match = bed.match(/(\d+)\s*$/);
  return match ? `Bed ${match[1]}` : bed;
}

/**
 * Raw /graph/patient/{id}/timeline responses, fetched in parallel. A patient
 * whose timeline fails is simply absent from the result.
 */
export async function fetchPatientTimelines(
  patientIds: number[]
): Promise<Record<number, PatientTimelineResponse>> {
  const unique = Array.from(new Set(patientIds));
  const settled = await Promise.allSettled(
    unique.map(async (id) => ({ id, timeline: await graphApi.getPatientTimeline(id) }))
  );
  const out: Record<number, PatientTimelineResponse> = {};
  for (const r of settled) if (r.status === "fulfilled") out[r.value.id] = r.value.timeline;
  return out;
}

export function placementsFrom(
  timelines: Record<number, PatientTimelineResponse>
): Record<number, PatientPlacement> {
  const out: Record<number, PatientPlacement> = {};
  for (const [id, t] of Object.entries(timelines)) out[Number(id)] = placementFromTimeline(t);
  return out;
}

export async function fetchPatientPlacements(
  patientIds: number[]
): Promise<Record<number, PatientPlacement>> {
  return placementsFrom(await fetchPatientTimelines(patientIds));
}

export interface WardStay {
  ward: string;
  start: string;
  end: string;
}

/**
 * Ward stays with their recorded exit times — movement events of
 * location_type "ward", which carry end_timestamp. Nothing is inferred.
 */
export function wardStaysFromTimeline(timeline: PatientTimelineResponse): WardStay[] {
  return timeline.events
    .filter(
      (e) =>
        e.event_type === "movement" &&
        e.details?.location_type === "ward" &&
        e.details?.location_name &&
        e.end_timestamp
    )
    .map((e) => ({
      ward: String(e.details?.location_name),
      start: e.timestamp,
      end: e.end_timestamp as string,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
