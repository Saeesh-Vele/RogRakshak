/**
 * The facts the interactive hero shows, derived from the bundled CASE-2026-001
 * fixture (src/data/mock_investigation_results.json — checked against the live
 * API, see the README). Computed on the server in page.tsx; only this small,
 * serialisable result is sent to the browser.
 *
 * Node ids match network-data.ts: index = patient 1, staff = staff 1,
 * d1/d2/d3 = patients 2/3/4.
 */

import fixtureRaw from "@/data/mock_investigation_results.json";
import type { InvestigationCase } from "@/types/api";

export type FactNodeId = "index" | "staff" | "d1" | "d2" | "d3";

export interface FactHop {
  /** Edge key, as in network-data EDGES: `${from}-${to}`. */
  key: string;
  from: FactNodeId;
  to: FactNodeId;
  location: string;
  start: string;
  end: string;
  minutes: number;
}

export interface FactNode {
  id: FactNodeId;
  name: string;
  role: string;
  mrn: string | null;
  culture: string | null;
}

export interface CaseEvent {
  at: string;
  /** What changes in the picture at this moment. */
  kind: "hop-start" | "hop-end" | "culture";
  text: string;
}

export interface CaseFacts {
  caseId: string;
  nodes: Record<FactNodeId, FactNode>;
  hops: FactHop[];
  events: CaseEvent[];
  start: string;
  end: string;
}

const PATIENT_TO_NODE: Record<number, FactNodeId> = { 1: "index", 2: "d1", 3: "d2", 4: "d3" };

const clean = (name: string) => name.replace(/\s*\((?:Index|Downstream\s*\d*)\)\s*$/i, "");

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function deriveCaseFacts(): CaseFacts {
  const inv = (fixtureRaw as unknown as { investigation: InvestigationCase }).investigation;
  const culture = new Map<number, string>();
  for (const p of inv.patients) if (p.positive_culture_date) culture.set(p.id, p.positive_culture_date);

  const nodes = {} as Record<FactNodeId, FactNode>;
  const hops = new Map<string, FactHop>();

  for (const ch of inv.transmission_chains) {
    // Staff-mediated chains: nodes[i] → nodes[i+1] is hop i
    const ids: FactNodeId[] = ch.nodes.map((n) => (n.type === "staff" ? "staff" : PATIENT_TO_NODE[n.id]));
    ch.nodes.forEach((n, i) => {
      const id = ids[i];
      if (!id || nodes[id]) return;
      const patient = n.type === "patient" ? [inv.index_patient, ...inv.candidate_patients].find((p) => p.id === n.id) : null;
      nodes[id] = {
        id,
        name: clean(n.name),
        role: id === "index" ? "Index patient" : id === "staff" ? "Shared attendant" : "Downstream case",
        mrn: patient?.mrn ?? null,
        culture: n.type === "patient" ? culture.get(n.id) ?? null : null,
      };
    });
    ch.hops.forEach((h, i) => {
      const from = ids[i];
      const to = ids[i + 1];
      if (!from || !to) return;
      const key = `${from}-${to}`;
      if (!hops.has(key)) {
        hops.set(key, {
          key,
          from,
          to,
          location: h.location,
          start: h.start_time,
          end: h.end_time,
          minutes: h.overlap_minutes ?? 0,
        });
      }
    });
  }

  const hopList = Array.from(hops.values());
  const events: CaseEvent[] = [];

  // Hops sharing a window (the nurse's General Medicine A shift reached all
  // three downstream patients at once) are reported as one event each way.
  const byWindow = new Map<string, FactHop[]>();
  for (const h of hopList) {
    const k = `${h.start}|${h.end}|${h.location}`;
    byWindow.set(k, [...(byWindow.get(k) ?? []), h]);
  }
  for (const group of Array.from(byWindow.values())) {
    const h = group[0];
    const who = (id: FactNodeId) => nodes[id]?.name ?? id;
    const pairs =
      group.length === 1
        ? `${who(h.from)} and ${who(h.to)}`
        : `${who(h.from)} with ${group.map((g) => who(g.to)).join(", ").replace(/, ([^,]*)$/, " and $1")}`;
    events.push({ at: h.start, kind: "hop-start", text: `${h.location} shift overlap begins: ${pairs}` });
    events.push({
      at: h.end,
      kind: "hop-end",
      text: `Overlap ends: ${Math.round(h.minutes / 60)}h ${group.length > 1 ? "each" : ""} in ${h.location}`.replace("  ", " "),
    });
  }
  for (const n of Object.values(nodes)) {
    if (n.culture) events.push({ at: n.culture, kind: "culture", text: `${n.name}: culture positive` });
  }
  events.sort((a, b) => a.at.localeCompare(b.at) || (a.kind === "hop-start" ? -1 : 1));

  return {
    caseId: inv.case_id,
    nodes,
    hops: hopList,
    events,
    start: events[0].at,
    end: events[events.length - 1].at,
  };
}

export { fmt as formatFactTime };
