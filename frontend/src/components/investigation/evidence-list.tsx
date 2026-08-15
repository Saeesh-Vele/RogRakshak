"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EvidenceItem } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { EvidenceDetail } from "@/components/investigation/evidence-card";
import {
  evidenceTier,
  evidenceTypeLabel,
  tierBadgeVariant,
  tierReason,
  type RiskTier,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/**
 * HIGH evidence carries a red rail and a faint red wash so it separates from
 * the rest of the stack while collapsed, without the row having to be read.
 */
const TIER_ROW: Record<RiskTier, string> = {
  HIGH: "border-l-[3px] border-l-risk-high-foreground/70 bg-risk-high/40 hover:bg-risk-high/60",
  MEDIUM: "border-l-[3px] border-l-risk-medium-foreground/40 hover:bg-muted/50",
  LOW: "border-l-[3px] border-l-transparent hover:bg-muted/50",
};

interface EvidenceListProps {
  items: EvidenceItem[];
  /**
   * Evidence the graph asked us to reveal. The nonce lets the same id be
   * requested twice in a row and still re-trigger the scroll + highlight.
   */
  focused?: { id: string; nonce: number } | null;
}

export function EvidenceList({ items, focused }: EvidenceListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const allExpanded = items.length > 0 && expanded.size === items.length;

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setExpanded((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.evidence_id))
    );
  }, [items]);

  // Clicking a graph edge deep-links to its evidence: open the row, bring it
  // into view, and flash it so the eye lands in the right place.
  useEffect(() => {
    if (!focused) return;
    const { id } = focused;
    setExpanded((prev) => new Set(prev).add(id));
    setFlash(id);
    const el = document.getElementById(`evidence-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFlash((cur) => (cur === id ? null : cur)), 2000);
    return () => clearTimeout(t);
  }, [focused]);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        item,
        tier: evidenceTier(item),
        label: evidenceTypeLabel(item.type),
        reason: tierReason(item),
      })),
    [items]
  );

  if (rows.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-muted-foreground">
        No evidence recorded for this case.
      </p>
    );
  }

  return (
    <div className="px-5 pb-5">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          aria-expanded={allExpanded}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              allExpanded && "rotate-180"
            )}
          />
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <ul className="divide-hairline">
          {rows.map(({ item, tier, label, reason }) => {
            const id = item.evidence_id;
            const open = expanded.has(id);

            return (
              <li
                key={id}
                id={`evidence-${id}`}
                className={cn(
                  "scroll-mt-24 transition-shadow",
                  flash === id && "ring-2 ring-inset ring-primary"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-expanded={open}
                  className={cn(
                    "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    TIER_ROW[tier]
                  )}
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                  <Badge
                    variant={tierBadgeVariant[tier]}
                    size="tier"
                    className="w-[62px] shrink-0 justify-center"
                  >
                    {tier}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted-foreground">
                    {reason}
                  </span>
                </button>

                {open && (
                  <div className="animate-fade-in border-t border-border bg-card px-3.5 py-3.5 pl-[3.25rem]">
                    <EvidenceDetail item={item} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
