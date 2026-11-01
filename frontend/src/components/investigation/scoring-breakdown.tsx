import type { ScoringBreakdown } from "@/types/api";
import { cn } from "@/lib/utils";

/**
 * The score, shown working — exactly the arithmetic in
 * backend/app/services/detection/scoring_service.py:
 *
 *   weighted = round(raw × weight, 3)     per dimension
 *   total    = Σ weighted
 *   confidence = total clamped to [0, 1]
 *   status: ≥ 0.85 suspected cluster · ≥ 0.70 high priority ·
 *           ≥ 0.40 potential contact · otherwise no signal
 *
 * One bar out of 1.00 made of the weighted contributions, with the status
 * thresholds marked; then a row per dimension. Segments are told apart by
 * ink shade and by their numbered key, never by hue.
 */

const SHADES = ["bg-foreground", "bg-foreground/75", "bg-foreground/55", "bg-foreground/40", "bg-foreground/25"];

const THRESHOLDS = [
  { at: 0.4, label: "Potential" },
  { at: 0.7, label: "Priority" },
  { at: 0.85, label: "Cluster" },
];

const n3 = (v: number) => v.toFixed(3);

export function ScoringBreakdownView({ scoring }: { scoring: ScoringBreakdown }) {
  const dims = scoring.dimensions;
  const sum = dims.reduce((s, d) => s + d.weighted_score, 0);
  const weights = dims.reduce((s, d) => s + d.weight, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Weighted total</p>
          <p className="mt-1 font-display text-numeral text-foreground">{n3(scoring.total_score)}</p>
        </div>
        <p className="text-right text-meta text-muted-foreground">
          {(scoring.normalized_confidence * 100).toFixed(1)}% confidence
          <br />
          weights sum to {weights.toFixed(2)}
        </p>
      </div>

      {/* The bar: 0 → 1.00, contributions stacked, thresholds marked */}
      <div aria-hidden className="relative mt-4 pb-9">
        <div className="flex h-3 bg-sunken">
          {dims.map((d, i) => (
            <span
              key={d.dimension}
              className={cn(SHADES[i % SHADES.length], "border-r border-card last:border-r-0")}
              style={{ width: `${d.weighted_score * 100}%` }}
              title={`${d.dimension}: ${n3(d.weighted_score)}`}
            />
          ))}
        </div>
        {THRESHOLDS.map((t) => (
          <span key={t.at} className="absolute top-0" style={{ left: `${t.at * 100}%` }}>
            <span className="absolute -top-1 h-5 border-l border-dashed border-foreground/60" />
            <span className="absolute top-5 -translate-x-1/2 whitespace-nowrap font-mono text-[0.625rem] text-muted-foreground">
              {t.at.toFixed(2)}
              <span className="block text-center font-sans max-sm:hidden">{t.label}</span>
            </span>
          </span>
        ))}
      </div>

      <table className="mt-2 w-full border-collapse text-ui">
        <caption className="sr-only">Scoring dimensions</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 text-left label-caps font-medium">Dimension</th>
            <th scope="col" className="py-2 text-right label-caps font-medium">Raw</th>
            <th scope="col" className="py-2 text-right label-caps font-medium">× Weight</th>
            <th scope="col" className="py-2 text-right label-caps font-medium">= Weighted</th>
          </tr>
        </thead>
        <tbody>
          {dims.map((d, i) => (
            <tr key={d.dimension} className="border-b border-border align-top">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <span className="flex items-start gap-2">
                  <span aria-hidden className={cn("mt-1 h-2.5 w-2.5 shrink-0", SHADES[i % SHADES.length])} />
                  <span>
                    <span className="block font-medium text-foreground">{d.dimension}</span>
                    <span className="block text-meta text-muted-foreground">
                      {d.description} · {d.evidence_count} item{d.evidence_count === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
              </th>
              <td className="py-2.5 text-right font-mono text-meta text-foreground">{d.raw_score.toFixed(2)}</td>
              <td className="py-2.5 text-right font-mono text-meta text-muted-foreground">{d.weight.toFixed(2)}</td>
              <td className="py-2.5 text-right font-mono text-meta font-medium text-foreground">{n3(d.weighted_score)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3} className="pt-3 text-left font-medium text-foreground">
              Total
            </th>
            <td className="pt-3 text-right font-mono text-ui font-semibold text-foreground">
              {n3(scoring.total_score)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-3 break-words font-mono text-meta text-muted-foreground">
        {dims.map((d) => n3(d.weighted_score)).join(" + ")} = {n3(sum)}
      </p>
    </div>
  );
}
