import type { WardRisk } from "@/lib/metrics";
import type { RiskTier } from "@/lib/risk";

/**
 * Contact evidence per ward, as one strip per ward split by tier. Bar length is
 * the ward's evidence count against the busiest ward; every segment's count is
 * also written out, so the tiers never depend on colour alone.
 */

const TIER_FILL: Record<RiskTier, string> = {
  HIGH: "bg-risk-high-foreground",
  MEDIUM: "bg-node-downstream",
  LOW: "bg-input/50",
};

export function WardStrip({ wards }: { wards: WardRisk[] }) {
  if (wards.length === 0) {
    return (
      <p className="px-5 py-8 text-ui text-muted-foreground">
        No contact evidence records a ward yet.
      </p>
    );
  }
  const max = Math.max(...wards.map((w) => w.total));

  return (
    <ul className="divide-hairline">
      {wards.map((w) => {
        const tiers = (["HIGH", "MEDIUM", "LOW"] as const).filter((t) => w.counts[t] > 0);
        return (
          <li key={w.name} className="px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-ui font-medium text-foreground">{w.name}</p>
              <p className="shrink-0 font-mono text-meta text-muted-foreground">
                {w.caseIds.length} case{w.caseIds.length === 1 ? "" : "s"}
              </p>
            </div>
            <div aria-hidden className="mt-2 flex h-2.5 gap-px" style={{ width: `${(w.total / max) * 100}%` }}>
              {tiers.map((t) => (
                <span key={t} className={TIER_FILL[t]} style={{ flex: w.counts[t] }} />
              ))}
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-3 text-meta">
              <span className="text-muted-foreground">
                {w.total} contact item{w.total === 1 ? "" : "s"}:
              </span>
              {tiers.map((t) => (
                <span
                  key={t}
                  className={
                    t === "HIGH"
                      ? "text-risk-high-foreground"
                      : t === "MEDIUM"
                        ? "text-risk-medium-foreground"
                        : "text-muted-foreground"
                  }
                >
                  <span className="font-mono font-medium">{w.counts[t]}</span> {t}
                </span>
              ))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
