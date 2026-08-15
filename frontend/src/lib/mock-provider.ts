/**
 * Mock Investigation Data Provider.
 *
 * Loads data from the pre-computed fixture:
 *   data/fixtures/mock_investigation_results.json
 *
 * Implements the same interface as the live API provider so UI components
 * work identically in either mode.
 */

import type {
  InvestigationListResponse,
  InvestigationCase,
  EvidenceItem,
  InvestigationTimelineEntry,
} from "@/types/api";

// The fixture is bundled at build time via the JSON import.
// This avoids fetching a file at runtime and guarantees type safety.
import fixtureRaw from "@/data/mock_investigation_results.json";

interface MockFixture {
  metadata: Record<string, unknown>;
  investigation: InvestigationCase;
}

const fixture = fixtureRaw as unknown as MockFixture;

/** Simulates network latency for realistic loading states. */
function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockProvider = {
  async list(): Promise<InvestigationListResponse> {
    await delay();
    return {
      total_cases: 1,
      cases: [fixture.investigation],
    };
  },

  async get(caseId: string): Promise<InvestigationCase | null> {
    await delay();
    const cleanId = caseId.trim().toUpperCase();
    const fixtureId = fixture.investigation.case_id.toUpperCase();
    if (cleanId === fixtureId || cleanId === "CASE-001" || cleanId === "CASE-2026-001") {
      return fixture.investigation;
    }
    return null;
  },

  async create(req?: { target_patient_id?: number; organism?: string; resistance_profile?: string | null }): Promise<InvestigationCase> {
    await delay(800);
    if (!req) return fixture.investigation;
    return {
      ...fixture.investigation,
      organism: req.organism || fixture.investigation.organism,
      resistance_profile: req.resistance_profile !== undefined ? req.resistance_profile : fixture.investigation.resistance_profile,
    };
  },

  async getEvidence(caseId: string): Promise<EvidenceItem[]> {
    await delay();
    const cleanId = caseId.trim().toUpperCase();
    const fixtureId = fixture.investigation.case_id.toUpperCase();
    if (cleanId === fixtureId || cleanId === "CASE-001" || cleanId === "CASE-2026-001") {
      return fixture.investigation.evidence;
    }
    return [];
  },

  async getTimeline(
    caseId: string
  ): Promise<InvestigationTimelineEntry[]> {
    await delay();
    const cleanId = caseId.trim().toUpperCase();
    const fixtureId = fixture.investigation.case_id.toUpperCase();
    if (cleanId === fixtureId || cleanId === "CASE-001" || cleanId === "CASE-2026-001") {
      return fixture.investigation.timeline;
    }
    return [];
  },
};
