/**
 * The five scoring dimensions, drawn to scale.
 *
 * Each row's track length is that dimension's fixed weight (0.30 is full
 * width), and the fill is what the fixture case CASE-2026-001 actually scored
 * on it. So the picture shows both halves of the claim at once: the weights
 * never move, and the total is just their sum.
 *
 * Figures come from mock_investigation_results.json → investigation.scoring,
 * which mirrors the weights in docs/DETECTION_ARCHITECTURE.md.
 */

const MAX_WEIGHT = 0.3;

const DIMENSIONS = [
  {
    label: "Temporal contact overlap",
    weight: 0.3,
    scored: 0.276,
    evidence: 6,
    tone: "bg-coral",
  },
  {
    label: "Microbiological match",
    weight: 0.25,
    scored: 0.25,
    evidence: 3,
    tone: "bg-primary",
  },
  {
    label: "Resistance phenotype",
    weight: 0.2,
    scored: 0.2,
    evidence: 3,
    tone: "bg-node-staff",
  },
  {
    label: "Shared clinical intermediary",
    weight: 0.15,
    scored: 0.15,
    evidence: 6,
    tone: "bg-node-location",
  },
  {
    label: "Specimen clustering",
    weight: 0.1,
    scored: 0.088,
    evidence: 3,
    tone: "bg-node-downstream",
  },
];

export function ScoringWeights() {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-panel p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4 pb-4 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/45">
        <span>Dimension</span>
        <span>Weight · scored</span>
      </div>

      <ul className="space-y-4 border-t border-ink-line pt-4">
        {DIMENSIONS.map((d) => (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.8125rem] text-white/80">{d.label}</span>
              <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-white/45">
                {d.weight.toFixed(2)} ·{" "}
                <span className="text-white">{d.scored.toFixed(3)}</span>
              </span>
            </div>
            {/* Track length is the weight; fill is what this case scored. */}
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                style={{ width: `${(d.weight / MAX_WEIGHT) * 100}%` }}
              >
                <div
                  className={`h-full rounded-full ${d.tone}`}
                  style={{ width: `${(d.scored / d.weight) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[0.625rem] text-white/45">
                {d.evidence} items
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-ink-line pt-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/45">
          Total
        </span>
        <span className="font-display text-[1.5rem] leading-none tabular-nums text-white">
          0.964
        </span>
      </div>
    </div>
  );
}
