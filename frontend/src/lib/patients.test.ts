import { describe, expect, it } from "vitest";
import fixtureRaw from "@/data/mock_investigation_results.json";
import type { InvestigationCase } from "@/types/api";
import { caseIdFor, patientsFromCases } from "@/lib/patients";

const inv = (fixtureRaw as unknown as { investigation: InvestigationCase }).investigation;

describe("caseIdFor", () => {
  it("mirrors the backend's CASE-2026-{id:03d}", () => {
    expect(caseIdFor(1)).toBe("CASE-2026-001");
    expect(caseIdFor(4)).toBe("CASE-2026-004");
    expect(caseIdFor(40)).toBe("CASE-2026-040");
    expect(caseIdFor(123)).toBe("CASE-2026-123");
  });

  it("matches the fixture case for its index patient", () => {
    expect(caseIdFor(inv.index_patient.id)).toBe(inv.case_id);
  });
});

describe("patientsFromCases (mock-mode directory)", () => {
  it("lists each person in the case once, with their culture date", () => {
    const list = patientsFromCases([inv]);
    expect(list.map((p) => p.id)).toEqual([1, 2, 3, 4]);
    // The index patient's culture lives on `patients`, not `index_patient`
    expect(list[0].latest_culture?.collected_at).toBe("2026-08-03T17:00:00");
    expect(list.every((p) => p.latest_culture?.organism === inv.organism)).toBe(true);
  });
});
