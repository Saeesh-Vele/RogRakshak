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

const TIERS: RiskTier[] = ["HIGH", "MEDIUM", "LOW"];
const TIER_TITLE: Record<RiskTier, string> = {
  HIGH: "High tier: direct contact, 4h or more overlap",
  MEDIUM: "Medium tier: shorter contact or timing proximity",
  LOW: "Low tier: corroborating matches, or contact under 30 min",
};

interface EvidenceListProps {
  items: EvidenceItem[];
  /**
   * Evidence the graph asked us to reveal: every item behind the clicked edge
   * (a hop shared by several chains has one per chain). The nonce lets the
   * same edge be clicked twice and still re-trigger the scroll + highlight.
   */
  focused?: { ids: string[]; nonce: number } | null;
}

/**
 * Evidence grouped by tier, each group headed with its count. HIGH is set
 * apart by a restrained red rule down the group's edge — no tinted wash.
 *
 * Rows are disclosure buttons (aria-expanded + aria-controls) revealing the
 * item's detail. A graph edge click arrives as `focused`: the row opens,
 * scrolls into view and is outlined briefly.
 */
export function EvidenceList({ items, focused }: EvidenceListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<Set<string>>(() => new Set());
  const [announce, setAnnounce] = useState("");

  const groups = useMemo(() => {
    const g: Record<RiskTier, EvidenceItem[]> = { HIGH: [], MEDIUM: [], LOW: [] };
    for (const item of items) g[evidenceTier(item)].push(item);
    for (const t of TIERS) g[t].sort((a, b) => b.strength - a.strength);
    return g;
  }, [items]);

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

  useEffect(() => {
    if (!focused || focused.ids.length === 0) return;
    const ids = focused.ids;
    setExpanded((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setFlash(new Set(ids));
    setAnnounce(
      ids.length === 1
        ? "Opened the evidence item for the selected edge."
        : `Opened ${ids.length} evidence items for the selected edge, one per chain that shares it.`
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait a frame so the opened rows have their full height, then bring the
    // first of them (in page order) into view
    requestAnimationFrame(() => {
      const els = ids
        .map((id) => document.getElementById(`evidence-${id}`))
        .filter((el): el is HTMLElement => Boolean(el))
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      els[0]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    const t = setTimeout(() => setFlash(new Set()), 2600);
    return () => clearTimeout(t);
  }, [focused]);

  if (items.length === 0) {
    return <p className="py-6 text-ui text-muted-foreground">No evidence recorded for this case.</p>;
  }

  return (
    <div>
      <p role="status" className="sr-only">
        {announce}
      </p>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-meta text-muted-foreground">
          {TIERS.map((t) => `${groups[t].length} ${t}`).join(" · ")}
        </p>
        <button
          type="button"
          onClick={toggleAll}
          aria-expanded={allExpanded}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-ui text-muted-foreground transition-colors hover:border-input hover:text-foreground max-sm:h-11"
        >
          <ChevronDown
            aria-hidden
            className={cn("h-3.5 w-3.5 transition-transform duration-200", allExpanded && "rotate-180")}
          />
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-6">
        {TIERS.filter((t) => groups[t].length > 0).map((tier) => (
          <section
            key={tier}
            aria-label={`${tier} tier evidence, ${groups[tier].length} items`}
            className={cn("border-l-2 pl-4", tier === "HIGH" ? "border-l-risk-high-foreground" : "border-l-border")}
          >
            <h3 className="flex items-baseline gap-3">
              <Badge variant={tierBadgeVariant[tier]} size="tier">
                {tier}
              </Badge>
              <span className="font-mono text-meta text-foreground">{groups[tier].length}</span>
              <span className="hidden text-meta text-muted-foreground sm:inline">{TIER_TITLE[tier]}</span>
            </h3>
            <ul className="mt-2 divide-hairline border-y border-border">
              {groups[tier].map((item) => {
                const id = item.evidence_id;
                const open = expanded.has(id);
                return (
                  <li
                    key={id}
                    id={`evidence-${id}`}
                    className={cn(
                      "scroll-mt-32 outline outline-2 -outline-offset-2 transition-[outline-color] duration-500",
                      flash.has(id) ? "outline-primary" : "outline-transparent"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      aria-expanded={open}
                      aria-controls={`evidence-panel-${id}`}
                      className="flex min-h-10 w-full items-center gap-3 py-2 pr-2 text-left transition-colors hover:bg-sunken/60 max-sm:min-h-11"
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          open && "rotate-180"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-ui font-medium text-foreground">
                        {evidenceTypeLabel(item.type)}
                      </span>
                      <span className="shrink-0 font-mono text-meta text-muted-foreground">
                        {tierReason(item)}
                      </span>
                    </button>
                    <div
                      id={`evidence-panel-${id}`}
                      hidden={!open}
                      className="border-t border-border pb-4 pl-7 pr-2 pt-3"
                    >
                      {open && <EvidenceDetail item={item} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
