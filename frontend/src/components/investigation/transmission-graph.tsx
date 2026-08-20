"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  InvestigationCase,
  PatientPlacement,
  TransmissionChain,
} from "@/types/api";
import { evidenceTypeLabel, formatMinutes } from "@/lib/risk";
import { shortBedLabel } from "@/lib/patient-placement";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  EntityNode,
  ENTITY_STYLES,
  type EntityKind,
} from "@/components/investigation/graph-nodes";

const nodeTypes = { entity: EntityNode };

const COL_X = { location: -70, index: 250, vector: 250, downstream: 210 };
const ROW_Y = { location: 40, index: 0, vector: 215, downstream: 450 };

/**
 * Seed names carry their role inline ("Rajesh Verma (Index)",
 * "Suresh Joshi (Downstream 1)"). The card renders the role separately, so the
 * parenthetical is dropped to avoid saying it twice. Nothing else is altered.
 */
function displayName(name: string): string {
  return name.replace(/\s*\((?:Index|Downstream\s*\d*)\)\s*$/i, "").trim() || name;
}

/** "Klebsiella pneumoniae" -> "K. pneumoniae", matching the reference cards. */
function abbreviateOrganism(organism: string): string {
  const parts = organism.trim().split(/\s+/);
  if (parts.length < 2) return organism;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function organismLine(inv: InvestigationCase): string {
  const base = abbreviateOrganism(inv.organism);
  return inv.resistance_profile ? `${base} (${inv.resistance_profile})` : base;
}

function placementLine(p: PatientPlacement | undefined): string | undefined {
  if (!p) return undefined;
  const bed = shortBedLabel(p.bed);
  if (p.ward && bed) return `${p.ward} • ${bed}`;
  return p.ward ?? bed ?? undefined;
}

interface BuiltGraph {
  nodes: Node[];
  edges: Edge[];
  counts: Record<EntityKind, number>;
  clusterLabel: string | null;
}

function buildGraph(
  inv: InvestigationCase,
  chains: TransmissionChain[],
  enabled: Record<EntityKind, boolean>,
  placements: Record<number, PatientPlacement>
): BuiltGraph {
  const counts: Record<EntityKind, number> = {
    index: 0,
    downstream: 0,
    vector: 0,
    location: 0,
  };
  const nodeMap = new Map<string, Node>();
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const organism = organismLine(inv);
  const evidenceById = new Map(inv.evidence.map((e) => [e.evidence_id, e]));

  const addNode = (
    key: string,
    kind: EntityKind,
    x: number,
    y: number,
    data: Record<string, unknown>
  ) => {
    if (!seen.has(key)) {
      seen.add(key);
      counts[kind] += 1;
    }
    if (nodeMap.has(key) || !enabled[kind]) return;
    nodeMap.set(key, {
      id: key,
      type: "entity",
      position: { x, y },
      data: { kind, ...data },
      draggable: true,
      zIndex: 2,
    });
  };

  // --- Index patient ---
  const indexKey = `patient-${inv.index_patient.id}`;
  addNode(indexKey, "index", COL_X.index, ROW_Y.index, {
    name: displayName(inv.index_patient.name),
    roleLabel: "Index patient",
    organism,
    placement: placementLine(placements[inv.index_patient.id]),
  });

  // --- Vectors (staff mediating chains) and downstream cases ---
  let vectorCol = 0;
  let downstreamCol = 0;

  for (const chain of chains) {
    const from = chain.nodes[0];
    const via = chain.nodes.length >= 3 ? chain.nodes[1] : null;
    const to = chain.nodes[chain.nodes.length - 1];
    if (!from || !to) continue;

    const fromKey = `${from.type}-${from.id}`;
    const toKey = `${to.type}-${to.id}`;
    const viaKey = via ? `${via.type}-${via.id}` : null;

    if (via && viaKey && !seen.has(viaKey)) {
      addNode(viaKey, "vector", COL_X.vector + vectorCol * 300, ROW_Y.vector, {
        name: displayName(via.name),
        roleLabel: "Intermediary vector",
        placement: via.role ?? undefined,
      });
      vectorCol += 1;
    }

    if (!seen.has(toKey)) {
      const candidateIndex = inv.candidate_patients.findIndex(
        (p) => p.id === to.id
      );
      addNode(
        toKey,
        "downstream",
        COL_X.downstream + downstreamCol * 268 - 268,
        ROW_Y.downstream + (downstreamCol % 2) * 96,
        {
          name: displayName(to.name),
          roleLabel: `Downstream case ${candidateIndex + 1}`,
          organism,
          placement: placementLine(placements[to.id]),
        }
      );
      downstreamCol += 1;
    }

    // Contact edges: dashed + red. The relationship name comes from the
    // evidence type behind the hop — not every chain is staff-mediated
    // (patient_colocation chains have no vector at all).
    const hop = chain.hops[0];
    const hopEvidence = hop ? evidenceById.get(hop.evidence_id) : undefined;
    const overlap = hop?.overlap_minutes;
    const relation = hopEvidence
      ? evidenceTypeLabel(hopEvidence.type, true)
      : "Contact";
    const duration = overlap ? formatMinutes(overlap) : null;
    /**
     * Two label registers. A staff-mediated hop runs through a vector card that
     * already says "Intermediary vector", so repeating "Staff contact" on both
     * of its edges is noise — the duration is the only new information. A direct
     * hop has no such card, so it still names the relationship.
     */
    const viaLabel = duration ?? relation;
    const directLabel = duration ? `${relation} · ${duration}` : relation;

    const contactEdge = (
      source: string,
      target: string,
      suffix: string,
      label: string
    ) => {
      if (!nodeMap.has(source) || !nodeMap.has(target)) return;
      edges.push({
        id: `${chain.chain_id}-${suffix}`,
        source,
        target,
        label,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "hsl(var(--node-infected))",
          strokeWidth: 1.75,
          strokeDasharray: "6 4",
        },
        labelStyle: {
          fill: "hsl(var(--risk-high-foreground))",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.02em",
        },
        // White, so the chip reads as cutting the line rather than sitting on
        // a second coloured field next to it.
        labelBgStyle: {
          fill: "hsl(var(--card))",
          fillOpacity: 1,
          stroke: "hsl(var(--node-infected))",
          strokeOpacity: 0.35,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 999,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "hsl(var(--node-infected))",
          width: 13,
          height: 13,
        },
        data: { evidenceId: hop?.evidence_id },
        zIndex: 1,
      });
    };

    if (viaKey) {
      contactEdge(fromKey, viaKey, "a", viaLabel);
      contactEdge(viaKey, toKey, "b", viaLabel);
    } else {
      contactEdge(fromKey, toKey, "direct", directLabel);
    }
  }

  // --- Ward nodes, from evidence[].location ---
  const wardCounts = new Map<string, number>();
  for (const e of inv.evidence) {
    if (e.location) wardCounts.set(e.location, (wardCounts.get(e.location) ?? 0) + 1);
  }
  const wards = Array.from(wardCounts.entries()).sort((a, b) => b[1] - a[1]);

  wards.forEach(([ward, evidenceCount], i) => {
    const key = `ward-${ward}`;
    addNode(key, "location", COL_X.location, ROW_Y.location + i * 150, {
      name: ward,
      roleLabel: `${evidenceCount} evidence item${evidenceCount !== 1 ? "s" : ""}`,
    });
  });

  // Structural edges: solid grey, patient -> the ward they actually occupied.
  const linkWard = (patientId: number, nodeKey: string) => {
    const ward = placements[patientId]?.ward;
    if (!ward) return;
    const wardKey = `ward-${ward}`;
    if (!nodeMap.has(wardKey) || !nodeMap.has(nodeKey)) return;
    edges.push({
      id: `placement-${patientId}`,
      source: wardKey,
      target: nodeKey,
      type: "smoothstep",
      // Same grey the ward nodes and their legend swatch use, so the line is
      // visibly tied to the thing it comes from. Subordinate to the coral
      // contact edges, but it still has to be legible on its own.
      style: {
        stroke: "hsl(var(--node-neutral))",
        strokeWidth: 1.5,
        strokeDasharray: "5 4",
      },
      zIndex: 0,
    });
  };

  linkWard(inv.index_patient.id, indexKey);
  for (const p of inv.candidate_patients) linkWard(p.id, `patient-${p.id}`);

  // --- Cluster region + per-node membership ---
  const members = Array.from(nodeMap.values()).filter((n) => {
    const kind = (n.data as { kind: EntityKind }).kind;
    return kind === "index" || kind === "downstream";
  });

  let clusterLabel: string | null = null;
  if (members.length > 1) {
    // Membership is carried by the per-node dashed ring only. The enclosing
    // region was dropped with this layout: the index sits above the vector and
    // the downstream cases below it, so any bounding box swallows the vector
    // and ward nodes and implies they are cluster members.
    for (const m of members) m.data = { ...m.data, inCluster: true };

    const topWard = wards[0]?.[0];
    clusterLabel = topWard ? `Potential cluster — ${topWard}` : "Potential cluster";
  }

  return { nodes: Array.from(nodeMap.values()), edges, counts, clusterLabel };
}

export function GraphLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground",
        className
      )}
    >
      {(Object.keys(ENTITY_STYLES) as EntityKind[]).map((kind) => (
        <span key={kind} className="flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full", ENTITY_STYLES[kind].dot)}
          />
          {ENTITY_STYLES[kind].label}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span
          className="h-0 w-5 border-t-2 border-dashed"
          style={{ borderColor: "hsl(var(--node-infected))" }}
        />
        Contact pathway
      </span>
      <span className="flex items-center gap-2">
        <span className="h-0 w-5 border-t-[1.5px] border-dashed border-node-neutral" />
        Admitted ward
      </span>
    </div>
  );
}

interface TransmissionGraphProps {
  investigation: InvestigationCase;
  chains: TransmissionChain[];
  placements?: Record<number, PatientPlacement>;
  onSelectEvidence?: (evidenceId: string) => void;
  height?: string;
}

export function TransmissionGraph({
  investigation,
  chains,
  placements = {},
  onSelectEvidence,
  height = "h-[560px]",
}: TransmissionGraphProps) {
  const [enabled, setEnabled] = useState<Record<EntityKind, boolean>>({
    index: true,
    downstream: true,
    vector: true,
    location: true,
  });

  const built = useMemo(
    () => buildGraph(investigation, chains, enabled, placements),
    [investigation, chains, enabled, placements]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  // useNodesState only seeds from its initial argument, so the rebuilt graph
  // has to be pushed in whenever filters, placements or the case change.
  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const evId = (edge.data as Record<string, unknown>)?.evidenceId;
      if (evId && onSelectEvidence) onSelectEvidence(String(evId));
    },
    [onSelectEvidence]
  );

  if (chains.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No contact pathways identified for this case.
      </div>
    );
  }

  const fallbackText = chains
    .map((c) => `${c.chain_id}: ${c.nodes.map((n) => n.name).join(" → ")}`)
    .join("; ");

  return (
    <div
      className={cn("relative w-full bg-card", height)}
      role="img"
      aria-label={`Transmission graph: ${fallbackText}`}
    >
      <ReactFlow
        key={Object.values(enabled).join()}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.25}
        maxZoom={1.8}
        nodesConnectable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="hsl(220 13% 88%)"
          gap={18}
          size={1}
        />
        <Controls
          showInteractive
          position="bottom-left"
          className={cn(
            "!m-4 !overflow-hidden !rounded-xl !border !border-border !bg-card !shadow-pop",
            "[&_button]:!h-8 [&_button]:!w-8 [&_button]:!border-0 [&_button]:!border-b [&_button]:!border-border",
            "[&_button]:!bg-card [&_button]:!text-muted-foreground",
            "[&_button:last-child]:!border-b-0",
            "[&_button:hover]:!bg-muted [&_button:hover]:!text-foreground",
            "[&_svg]:!fill-current"
          )}
        />
      </ReactFlow>

      {/* Cluster caption — the membership signal itself is the ring on each node */}
      {built.clusterLabel && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2.5 rounded-lg border border-node-infected/25 bg-card px-3 py-2 shadow-card">
          <span className="h-3 w-3 shrink-0 rounded-full border border-dashed border-node-infected" />
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-risk-high-foreground">
            {built.clusterLabel}
          </span>
        </div>
      )}

      {/* Node-type filters */}
      <div className="absolute right-4 top-4 z-10 w-[196px] overflow-hidden rounded-xl border border-border bg-card shadow-pop">
        <p className="border-b border-border px-3.5 py-2.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
          Show
        </p>
        <div className="divide-hairline">
          {(Object.keys(ENTITY_STYLES) as EntityKind[]).map((kind) => {
            const count = built.counts[kind];
            const absent = count === 0;
            return (
              <label
                key={kind}
                className={cn(
                  "flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors",
                  absent
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:bg-muted/50"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      ENTITY_STYLES[kind].dot
                    )}
                  />
                  <span className="truncate text-[0.75rem] text-foreground">
                    {ENTITY_STYLES[kind].label}
                  </span>
                  <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </span>
                <Switch
                  checked={enabled[kind] && !absent}
                  aria-label={`Toggle ${ENTITY_STYLES[kind].label}`}
                  disabled={absent}
                  onCheckedChange={() =>
                    setEnabled((s) => ({ ...s, [kind]: !s[kind] }))
                  }
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
