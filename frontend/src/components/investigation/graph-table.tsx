import type { InvestigationCase, PatientPlacement } from "@/types/api";
import { evidenceTypeLabel, formatMinutes } from "@/lib/risk";

/**
 * The transmission graph as tables — the accessible alternative behind
 * "View as table". Built from the same data the graph draws: chain nodes and
 * the hops between them (hop i joins nodes[i] and nodes[i + 1]), each with its
 * recorded location, window, overlap and evidence item. It does not touch the
 * graph component or its layout.
 */

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const th = "py-2 pr-4 text-left align-bottom text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground";
const td = "py-2 pr-4 align-top";

export function GraphTable({
  investigation: inv,
  placements = {},
}: {
  investigation: InvestigationCase;
  placements?: Record<number, PatientPlacement>;
}) {
  const evidence = new Map(inv.evidence.map((e) => [e.evidence_id, e]));

  // Nodes, once each, in the order the chains introduce them
  const nodes = new Map<string, { name: string; role: string; detail: string }>();
  for (const ch of inv.transmission_chains) {
    ch.nodes.forEach((n, i) => {
      const key = `${n.type}-${n.id}`;
      if (nodes.has(key)) return;
      const last = i === ch.nodes.length - 1;
      const p = n.type === "patient" ? placements[n.id] : undefined;
      nodes.set(key, {
        name: n.name,
        role:
          i === 0 ? "Index patient" : last ? "Downstream case" : n.type === "staff" ? "Intermediary staff" : "Intermediary",
        detail: [n.role, p?.ward, p?.bed].filter(Boolean).join(" · "),
      });
    });
  }

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Graph nodes table">
        <table className="w-full min-w-[520px] border-collapse text-ui">
          <caption className="mb-2 text-left font-medium text-foreground">
            People in the graph ({nodes.size})
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={th}>Name</th>
              <th scope="col" className={th}>Role in the chain</th>
              <th scope="col" className={th}>Detail</th>
            </tr>
          </thead>
          <tbody className="divide-hairline">
            {Array.from(nodes.entries()).map(([key, n]) => (
              <tr key={key}>
                <th scope="row" className={`${td} text-left font-medium text-foreground`}>{n.name}</th>
                <td className={`${td} text-foreground`}>{n.role}</td>
                <td className={`${td} text-muted-foreground`}>{n.detail || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Graph relationships table">
        <table className="w-full min-w-[760px] border-collapse text-ui">
          <caption className="mb-2 text-left font-medium text-foreground">
            Relationships ({inv.transmission_chains.reduce((s, c) => s + c.hops.length, 0)} hops)
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={th}>Chain</th>
              <th scope="col" className={th}>From → To</th>
              <th scope="col" className={th}>Relationship</th>
              <th scope="col" className={th}>Location</th>
              <th scope="col" className={th}>Window</th>
              <th scope="col" className={`${th} text-right`}>Overlap</th>
              <th scope="col" className={th}>Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-hairline">
            {inv.transmission_chains.flatMap((ch) =>
              ch.hops.map((h, i) => {
                const from = ch.nodes[i];
                const to = ch.nodes[i + 1];
                const ev = evidence.get(h.evidence_id);
                return (
                  <tr key={`${ch.chain_id}-${i}`}>
                    <td className={`${td} font-mono text-meta text-muted-foreground`}>{ch.chain_id}</td>
                    <th scope="row" className={`${td} text-left font-normal text-foreground`}>
                      {from?.name ?? "—"} → {to?.name ?? "—"}
                    </th>
                    <td className={`${td} text-foreground`}>{ev ? evidenceTypeLabel(ev.type) : "Contact"}</td>
                    <td className={`${td} text-foreground`}>{h.location}</td>
                    <td className={`${td} whitespace-nowrap font-mono text-meta text-muted-foreground`}>
                      {fmt(h.start_time)} → {fmt(h.end_time)}
                    </td>
                    <td className={`${td} text-right font-mono text-meta text-foreground`}>
                      {h.overlap_minutes != null ? formatMinutes(h.overlap_minutes) : "—"}
                    </td>
                    <td className={`${td} font-mono text-meta text-muted-foreground`}>{h.evidence_id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
