import fixtureRaw from "@/data/mock_investigation_results.json";
import type { InvestigationCase } from "@/types/api";
import { deriveMetrics } from "@/lib/metrics";
import { evidenceTier } from "@/lib/risk";
import { StatusBand } from "@/components/dashboard/status-band";
import { StatusBadge } from "@/components/investigation/status-badge";
import { TimelineView } from "@/components/investigation/timeline-view";
import { EvidenceList } from "@/components/investigation/evidence-list";
import { ScoringBreakdownView } from "@/components/investigation/scoring-breakdown";
import { Frame, FrameColumn, ProductFrames } from "@/components/landing/product-frames";

/**
 * The real product, rendered from its real components with CASE-2026-001.
 *
 * The data is the bundled fixture (src/data/mock_investigation_results.json),
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

export function ProductShowcase() {
  const m = deriveMetrics([inv]);
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
          <StatusBand
            stats={[
              { label: "Active cases", value: m.activeCases, tone: "primary", hint: "Open investigations" },
              { label: "High-risk contacts", value: m.highRiskContacts, tone: "high", hint: `${m.highRiskLinks} with high-tier evidence` },
              { label: "Potential clusters", value: m.potentialClusters, tone: "medium", hint: m.highPriorityCount > 0 ? `${m.highPriorityCount} high priority` : "None escalated" },
              { label: "Flagged locations", value: m.flaggedLocations, tone: "location", hint: m.topLocation ?? "—" },
            ]}
          />
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2.5">
                <span className="font-mono text-ui font-medium text-foreground">{inv.case_id}</span>
                <StatusBadge status={inv.status} />
              </p>
              <p className="mt-1 truncate text-ui text-muted-foreground">
                {inv.index_patient.name} · <span className="italic">{inv.organism}</span> ·{" "}
                {inv.resistance_profile} · {inv.candidate_patients.length} contacts
              </p>
            </div>
            <p className="font-display text-[1.375rem] leading-none text-foreground">
              {Math.round(inv.confidence * 100)}
              <span className="text-meta text-muted-foreground">%</span>
            </p>
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
