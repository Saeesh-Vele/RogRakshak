import type { ChainNodeType, InvestigationCase } from "@/types/api";
import { formatMinutes } from "@/lib/risk";

/**
 * A small, static drawing of one case's transmission chains, laid out in
 * three columns: index patient, intermediaries, reached patients. Drawn from
 * `transmission_chains` exactly — every node and edge is a chain node or hop,
 * and each edge is labelled with that hop's recorded overlap. It is a separate
 * SVG; the interactive graph (transmission-graph.tsx) is untouched.
 */

const COLOR: Record<"index" | "via" | "reached", string> = {
  index: "hsl(var(--node-infected))",
  via: "hsl(var(--node-location))",
  reached: "hsl(var(--node-downstream))",
};

const W = 560;
const COL_X = [70, 280, 490];
const ROW_H = 64;
const TOP = 34;

function shortName(name: string) {
  return name
    .replace(/\s*\((?:Index|Downstream\s*\d*)\)\s*$/i, "")
    .replace(/^(Nurse|Doctor|Technician)\s+/, "");
}

interface GNode {
  key: string;
  name: string;
  col: 0 | 1 | 2;
  kind: keyof typeof COLOR;
  type: ChainNodeType;
}

export function MiniChainGraph({ investigation: inv }: { investigation: InvestigationCase }) {
  const nodes = new Map<string, GNode>();
  const edges = new Map<string, { from: string; to: string; minutes: number | null }>();

  for (const chain of inv.transmission_chains) {
    const ns = chain.nodes;
    if (ns.length < 2) continue;
    ns.forEach((n, i) => {
      const key = `${n.type}-${n.id}`;
      if (nodes.has(key)) return;
      const last = i === ns.length - 1;
      nodes.set(key, {
        key,
        name: shortName(n.name),
        col: i === 0 ? 0 : last ? 2 : 1,
        kind: i === 0 ? "index" : last ? "reached" : "via",
        type: n.type,
      });
    });
    for (let i = 0; i < ns.length - 1; i++) {
      const from = `${ns[i].type}-${ns[i].id}`;
      const to = `${ns[i + 1].type}-${ns[i + 1].id}`;
      const ek = `${from}>${to}`;
      if (!edges.has(ek)) {
        edges.set(ek, { from, to, minutes: chain.hops[i]?.overlap_minutes ?? null });
      }
    }
  }

  if (nodes.size === 0) {
    return (
      <p className="px-5 py-8 text-ui text-muted-foreground">
        No evidence-supported pathway for this case.
      </p>
    );
  }

  // Stack each column and centre it against the tallest column
  const cols: GNode[][] = [[], [], []];
  for (const n of Array.from(nodes.values())) cols[n.col].push(n);
  const rows = Math.max(...cols.map((c) => c.length));
  const H = TOP + rows * ROW_H;
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((c, ci) => {
    const offset = ((rows - c.length) * ROW_H) / 2;
    c.forEach((n, ri) => pos.set(n.key, { x: COL_X[ci], y: TOP + offset + ri * ROW_H + ROW_H / 2 - 12 }));
  });

  const description = inv.transmission_chains
    .map(
      (ch) =>
        `${ch.chain_id}: ${ch.nodes.map((n) => shortName(n.name)).join(" to ")}` +
        (ch.hops.length ? `, ${ch.hops.map((h) => formatMinutes(h.overlap_minutes ?? 0)).join(" and ")} overlap` : "")
    )
    .join("; ");

  return (
    <>
      {/* Below sm the drawing would scale its labels to ~7px; list the chains instead */}
      <ol className="space-y-2 py-1 sm:hidden">
        {inv.transmission_chains.map((ch) => (
          <li key={ch.chain_id} className="text-ui text-foreground">
            <span className="mr-2 font-mono text-meta text-muted-foreground">{ch.chain_id}</span>
            {ch.nodes.map((n, i) => (
              <span key={`${n.type}-${n.id}`}>
                {i > 0 && (
                  <span className="text-muted-foreground">
                    {" "}→{ch.hops[i - 1]?.overlap_minutes != null && ` ${formatMinutes(ch.hops[i - 1].overlap_minutes!)} →`}{" "}
                  </span>
                )}
                {shortName(n.name)}
              </span>
            ))}
          </li>
        ))}
      </ol>
    <svg viewBox={`0 0 ${W} ${H}`} className="hidden h-auto w-full sm:block" role="img" aria-label={description}>
      {/* Column captions */}
      {["Index", cols[1].length ? "Via" : "", "Reached"].map((t, i) =>
        t ? (
          <text key={t} x={COL_X[i]} y={14} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px] uppercase tracking-[0.08em]">
            {t}
          </text>
        ) : null
      )}

      {Array.from(edges.values()).map((e) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={`${e.from}>${e.to}`}>
            <path
              d={`M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity={0.35}
              strokeWidth={1.25}
            />
            {e.minutes != null && (
              <text
                x={mx}
                y={my - 5}
                textAnchor="middle"
                className="fill-foreground font-mono text-[10px]"
                stroke="hsl(var(--card))"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {formatMinutes(e.minutes)}
              </text>
            )}
          </g>
        );
      })}

      {Array.from(nodes.values()).map((n) => {
        const p = pos.get(n.key)!;
        return (
          <g key={n.key}>
            <circle cx={p.x} cy={p.y} r={n.kind === "index" ? 9 : 7} fill={COLOR[n.kind]} />
            {n.kind === "index" && (
              <circle cx={p.x} cy={p.y} r={14} fill="none" stroke={COLOR.index} strokeOpacity={0.5} />
            )}
            <text x={p.x} y={p.y + 26} textAnchor="middle" className="fill-foreground text-[11px]">
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
    </>
  );
}
