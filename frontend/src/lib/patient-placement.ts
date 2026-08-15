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

export async function fetchPatientPlacements(
  patientIds: number[]
): Promise<Record<number, PatientPlacement>> {
  const unique = Array.from(new Set(patientIds));

  const settled = await Promise.allSettled(
    unique.map(async (id) => ({
      id,
      placement: placementFromTimeline(await graphApi.getPatientTimeline(id)),
    }))
  );

  const out: Record<number, PatientPlacement> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") {
      out[result.value.id] = result.value.placement;
    }
  }
  return out;
}
