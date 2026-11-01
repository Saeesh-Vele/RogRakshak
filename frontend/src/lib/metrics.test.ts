import { describe, expect, it } from "vitest";
import fixtureRaw from "@/data/mock_investigation_results.json";
import type { InvestigationCase } from "@/types/api";
import { deriveSummary, deriveTrend, deriveWardRisk } from "@/lib/metrics";

const inv = (fixtureRaw as unknown as { investigation: InvestigationCase }).investigation;

describe("deriveTrend", () => {
  it("includes the index patient's culture, which lives on `patients`, not `index_patient`", () => {
    const points = deriveTrend([inv]);
    expect(points[0].date).toBe("2026-08-03");
    expect(points[0].count).toBe(1);
    expect(points.at(-1)!.cumulative).toBe(4);
  });

  it("spans first to last positive with no padding days", () => {
    const points = deriveTrend([inv]);
    expect(points.map((p) => p.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]);
  });

  it("counts each patient once across overlapping cases", () => {
    expect(deriveTrend([inv, inv]).at(-1)!.cumulative).toBe(4);
  });
});

describe("deriveSummary / deriveWardRisk", () => {
  it("derives every figure from the case data", () => {
    const s = deriveSummary([inv]);
    expect(s).toMatchObject({
      caseCount: 1,
      positivePatients: 4,
      patientsInvolved: 4,
      highTierPatients: 3,
      wardCount: 2,
    });
    expect(s.byStatus.SUSPECTED_CLUSTER).toBe(1);
  });

  it("splits contact evidence per ward by tier", () => {
    const wards = deriveWardRisk([inv]);
    expect(wards.map((w) => [w.name, w.counts.HIGH, w.total])).toEqual([
      ["Intensive Care Unit (ICU)", 3, 3],
      ["General Medicine A", 3, 3],
    ]);
  });
});
