import fixtureRaw from "@/data/mock_investigation_results.json";
import type { InvestigationCase } from "@/types/api";
import { deriveSummary, deriveWardRisk } from "@/lib/metrics";
import { evidenceTier } from "@/lib/risk";
import { StatRow } from "@/components/dashboard/stat-row";
import { CaseRows } from "@/components/dashboard/case-rows";
import { TimelineView } from "@/components/investigation/timeline-view";
import { EvidenceList } from "@/components/investigation/evidence-list";
import { ScoringBreakdownView } from "@/components/investigation/scoring-breakdown";
import { Frame, FrameColumn, ProductFrames } from "@/components/landing/product-frames";

/**
 * The real product, rendered from its real components with CASE-2026-001.
 *
 * Every frame is labelled "Sample data, CASE-2026-001": this is a static
 * snapshot, not a live view. The data is the bundled fixture
 * (src/data/mock_investigation_results.json),
 * which matches what GET /api/investigations/CASE-2026-001 returns for every
 * figure shown — confidence, status, the 15 evidence items, the five scoring
 * dimensions and the timeline. Using it means the landing page renders
 * without a backend and without a signed-in session.
 *
 * As the app pages are reworked in Stages C–E these frames pick the changes up
 * automatically, because they are the same components.
 */

const inv = (fixtureRaw as unknown as { investigation: InvestigationCase }).investigation;
const TIER_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";

export function ProductShowcase() {
  const summary = deriveSummary([inv]);
  const wards = deriveWardRisk([inv]);
  const evidence = [...inv.evidence].sort(
    (a, b) => TIER_RANK[evidenceTier(a)] - TIER_RANK[evidenceTier(b)] || b.strength - a.strength
  );

  return (
    <ProductFrames>
      <FrameColumn className="lg:col-span-7">
      <Frame
        route="/dashboard"
        title="Surveillance at a glance"
        caption="Counts derived from every open investigation."
        amplitude={36}
        bodyClassName="max-h-[300px]"
      >
        <div style={{ zoom: 0.82 }}>
          <StatRow
            stats={[
              { label: "Investigations", value: summary.caseCount, sub: `${summary.byStatus.SUSPECTED_CLUSTER ?? 0} suspected cluster` },
              { label: "Positive cultures", value: summary.positivePatients, sub: `Patients, ${day(summary.firstPositive)}–${day(summary.lastPositive)}` },
              { label: "Linked at high tier", value: summary.highTierPatients, sub: `of ${summary.patientsInvolved} patients involved`, risk: true },
              { label: "Wards implicated", value: summary.wardCount, sub: wards.map((w) => w.name).join(", ") },
            ]}
          />
          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
            <CaseRows cases={[inv]} />
          </div>
        </div>
      </Frame>
      <Frame
        route={`/investigations/${inv.case_id} · evidence`}
        title="Evidence you can audit"
        caption={`${inv.evidence.length} atomic items, strongest tier first.`}
        amplitude={-28}
        bodyClassName="max-h-[380px] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
      >
        <div style={{ zoom: 0.82 }}>
          <EvidenceList items={evidence} />
        </div>
      </Frame>
      </FrameColumn>
      <FrameColumn className="lg:col-span-5 lg:pt-24">
      <Frame
        route={`/investigations/${inv.case_id} · scoring`}
        title="The score, shown working"
        caption="Each dimension's weight, raw score and evidence count."
        amplitude={-44}
        bodyClassName="max-h-[400px] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
      >
        <div style={{ zoom: 0.78 }}>
          <ScoringBreakdownView scoring={inv.scoring} />
        </div>
      </Frame>
      <Frame
        route={`/investigations/${inv.case_id} · timeline`}
        title="The index patient's stay, in order"
        caption="Admissions, moves, a procedure and the positive culture."
        amplitude={52}
        bodyClassName="max-h-[420px] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
      >
        <div style={{ zoom: 0.78 }}>
          <TimelineView entries={inv.timeline} />
        </div>
      </Frame>
      </FrameColumn>
    </ProductFrames>
  );
}
