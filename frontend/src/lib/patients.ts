/**
 * The patient directory, shared by the search palette and the New
 * Investigation picker.
 *
 * Live mode reads GET /graph/patients (id, name, MRN, latest culture) once and
 * caches it for the session. Mock mode has no graph service, so it lists the
 * people inside the fixture case, with that case's organism as their culture.
 */

import { graphApi } from "@/lib/api-client";
import type { InvestigationCase, PatientListItem } from "@/types/api";

let directory: Promise<PatientListItem[]> | null = null;

export function loadPatients(force = false): Promise<PatientListItem[]> {
  if (force) directory = null;
  directory ??= graphApi
    .listPatients()
    .then((r) => r.patients)
    .catch((err) => {
      directory = null; // let the next call retry
      throw err;
    });
  return directory;
}

export function patientsFromCases(cases: InvestigationCase[]): PatientListItem[] {
  const map = new Map<number, PatientListItem>();
  for (const c of cases) {
    for (const p of [c.index_patient, ...c.patients, ...c.candidate_patients]) {
      const existing = map.get(p.id);
      if (existing?.latest_culture?.collected_at) continue;
      map.set(p.id, {
        id: p.id,
        name: p.name,
        mrn: p.mrn,
        latest_culture: p.positive_culture_date
          ? {
              lab_report_id: 0,
              organism: c.organism,
              resistance_profile: c.resistance_profile,
              collected_at: p.positive_culture_date,
            }
          : existing?.latest_culture ?? null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

/**
 * The case ID the backend will assign for an index patient — it is derived
 * from the patient id (investigation_service.py: CASE-2026-{id:03d}), which is
 * why running a patient twice replaces their case.
 */
export function caseIdFor(patientId: number): string {
  return `CASE-2026-${String(patientId).padStart(3, "0")}`;
}
