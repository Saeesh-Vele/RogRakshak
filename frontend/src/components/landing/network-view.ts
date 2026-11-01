/**
 * View state for the interactive hero network, shared by the WebGL scene and
 * the static SVG fallback so both always show the same thing.
 *
 * Pure functions over CaseFacts (types only — the fixture itself never reaches
 * the browser; page.tsx derives the facts on the server).
 */

import type { CaseFacts, FactNodeId } from "@/components/landing/case-facts";

export const CHAIN_IDS: FactNodeId[] = ["index", "staff", "d1", "d2", "d3"];

export interface NetworkView {
  /** Person the user picked; their hops and neighbours stay lit, the rest dims. */
  selected: FactNodeId | null;
  /** The 36 patients with no link to the chain. */
  showUnlinked: boolean;
  /** True while the time scrubber is away from "now" (the full picture). */
  timeline: boolean;
  /** 0..1 per edge key (`index-staff`, `staff-d1`, …): how much of the overlap has happened. */
  edgeProgress: Record<string, number>;
  /** Whether each person has entered the picture at the scrubbed time. */
  nodeVisible: Record<string, boolean>;
  /** Whether each patient's positive culture has been collected by then. */
  cultured: Record<string, boolean>;
}

const ms = (iso: string) => new Date(iso).getTime();

export function computeView(
  facts: CaseFacts,
  time: number,
  selected: FactNodeId | null,
  showUnlinked: boolean
): NetworkView {
  const end = ms(facts.end);
  const timeline = time < end;
  const edgeProgress: Record<string, number> = {};
  const nodeVisible: Record<string, boolean> = { index: true };
  const cultured: Record<string, boolean> = {};

  for (const h of facts.hops) {
    const start = ms(h.start);
    const stop = ms(h.end);
    edgeProgress[h.key] = timeline ? Math.min(1, Math.max(0, (time - start) / (stop - start))) : 1;
    // A person enters the picture when their first overlap with the chain begins
    if (!timeline || time >= start) nodeVisible[h.to] = true;
  }
  for (const n of Object.values(facts.nodes)) {
    cultured[n.id] = Boolean(n.culture) && (!timeline || time >= ms(n.culture!));
  }
  return { selected, showUnlinked, timeline, edgeProgress, nodeVisible, cultured };
}

/** What stays lit when someone is selected: their hops and the people at the other end. */
export function highlight(facts: CaseFacts, selected: FactNodeId | null) {
  if (!selected) return null;
  const nodes = new Set<string>([selected]);
  const edges = new Set<string>();
  for (const h of facts.hops) {
    if (h.from === selected || h.to === selected) {
      edges.add(h.key);
      nodes.add(h.from);
      nodes.add(h.to);
    }
  }
  return { nodes, edges };
}

export function formatTime(iso: string | number) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

const hours = (minutes: number) => `${Math.round(minutes / 60)}h`;

/**
 * What a person card says — name, role, and for contacts their overlap hours,
 * read straight from the hops. Used by the hover card and the details line.
 */
export function describeNode(facts: CaseFacts, id: FactNodeId) {
  const n = facts.nodes[id];
  const lines: string[] = [];
  const mine = facts.hops.filter((h) => h.from === id || h.to === id);
  if (id === "staff") {
    const groups = new Map<string, typeof mine>();
    for (const h of mine) groups.set(`${h.location}|${h.start}`, [...(groups.get(`${h.location}|${h.start}`) ?? []), h]);
    for (const g of Array.from(groups.values())) {
      const others = g.map((h) => facts.nodes[h.from === id ? h.to : h.from].name);
      lines.push(
        `${hours(g[0].minutes)} ${g.length > 1 ? "each " : ""}with ${others.join(", ").replace(/, ([^,]*)$/, " and $1")} · ${g[0].location}, ${formatTime(g[0].start)}`
      );
    }
  } else {
    for (const h of mine) {
      const other = facts.nodes[h.from === id ? h.to : h.from].name;
      lines.push(`${hours(h.minutes)} overlap with ${other} · ${h.location}, ${formatTime(h.start)}`);
    }
  }
  if (n.culture) lines.push(`Culture positive ${formatTime(n.culture)}`);
  return { name: n.name, role: n.role, mrn: n.mrn, lines };
}
