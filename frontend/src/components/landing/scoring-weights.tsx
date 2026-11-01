/**
 * The five scoring dimensions, drawn to scale.
 *
 * Each row's track length is that dimension's fixed weight (0.30 is full
 * width) and the fill is what CASE-2026-001 actually scored on it, so the
 * figure shows both halves of the claim at once: the weights never move, and
 * the total is their sum. One ink colour throughout — the dimensions are
 * distinguished by their labels, not by hue.
 *
 * Figures come from mock_investigation_results.json → investigation.scoring,
 * which mirrors the weights in docs/DETECTION_ARCHITECTURE.md.
 */

const MAX_WEIGHT = 0.3;

const DIMENSIONS = [
  { label: "Temporal contact overlap", weight: 0.3, scored: 0.276, evidence: 6 },
  { label: "Microbiological match", weight: 0.25, scored: 0.25, evidence: 3 },
  { label: "Resistance phenotype", weight: 0.2, scored: 0.2, evidence: 3 },
  { label: "Shared clinical intermediary", weight: 0.15, scored: 0.15, evidence: 6 },
  { label: "Specimen clustering", weight: 0.1, scored: 0.088, evidence: 3 },
];

export function ScoringWeights() {
  return (
    <figure
      aria-label="Scoring weights and CASE-2026-001's score on each dimension"
      className="border-t border-foreground"
    >
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border py-2.5">
        <span className="label-caps">Dimension</span>
        <span className="label-caps w-12 text-right">Weight</span>
        <span className="label-caps w-14 text-right">Scored</span>
      </div>

      <ul>
        {DIMENSIONS.map((d) => (
          <li key={d.label} className="border-b border-border py-3.5">
            <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4">
              <span className="text-copy text-foreground">{d.label}</span>
              <span className="w-12 text-right font-mono text-meta text-muted-foreground">
                {d.weight.toFixed(2)}
              </span>
              <span className="w-14 text-right font-mono text-meta text-foreground">
                {d.scored.toFixed(3)}
              </span>
            </div>
            {/* Track length is the weight; fill is what this case scored. */}
            <div className="mt-2 flex items-center gap-3">
              <div
                className="h-1 bg-sunken"
                style={{ width: `${(d.weight / MAX_WEIGHT) * 100}%` }}
              >
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${(d.scored / d.weight) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-meta text-muted-foreground">
                {d.evidence} items
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between pt-4">
        <span className="label-caps">Weighted confidence</span>
        <span className="font-display text-numeral text-foreground">0.964</span>
      </div>
    </figure>
  );
}
