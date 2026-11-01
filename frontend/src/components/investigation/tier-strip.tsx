import type { EvidenceItem } from "@/types/api";
import { evidenceTier, type RiskTier } from "@/lib/risk";
import { cn } from "@/lib/utils";

/**
 * A case's evidence as one strip split by tier, with the counts written out
 * beside it (H / M / L), so the split never depends on colour alone.
 */

const FILL: Record<RiskTier, string> = {
  HIGH: "bg-risk-high-foreground",
  MEDIUM: "bg-node-downstream",
  LOW: "bg-input/45",
};

export function tierCounts(items: EvidenceItem[]): Record<RiskTier, number> {
  const c = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const e of items) c[evidenceTier(e)] += 1;
  return c;
}

export function TierStrip({ items, className }: { items: EvidenceItem[]; className?: string }) {
  const c = tierCounts(items);
  const total = items.length;
  const tiers = (["HIGH", "MEDIUM", "LOW"] as const).filter((t) => c[t] > 0);

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden className="flex h-2 w-20 shrink-0 gap-px bg-sunken">
        {tiers.map((t) => (
          <span key={t} className={FILL[t]} style={{ flex: c[t] }} />
        ))}
      </span>
      <span className="whitespace-nowrap font-mono text-meta">
        <span className="sr-only">
          {total} evidence items: {c.HIGH} high, {c.MEDIUM} medium, {c.LOW} low
        </span>
        <span aria-hidden>
          <span className="text-risk-high-foreground">{c.HIGH}</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-risk-medium-foreground">{c.MEDIUM}</span>
          <span className="text-muted-foreground"> · {c.LOW}</span>
        </span>
      </span>
    </span>
  );
}
