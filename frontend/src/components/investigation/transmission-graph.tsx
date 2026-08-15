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
  MiniMap,
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

const COL_X = { location: -60, index: 240, vector: 240, downstream: 200 };
const ROW_Y = { location: 40, index: 0, vector: 190, downstream: 380 };

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
    roleLabel: "Index Patient",
    rolePill: true,
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
        roleLabel: "Intermediary Vector",
        rolePill: true,
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
        COL_X.downstream + downstreamCol * 250 - 250,
        ROW_Y.downstream + (downstreamCol % 2) * 70,
        {
          name: displayName(to.name),
          roleLabel: `Downstream Case ${candidateIndex + 1}`,
          rolePill: false,
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
    const label = overlap
      ? `${relation} (${formatMinutes(overlap)} overlap)`
      : hop?.location
        ? `${relation} · ${hop.location}`
        : relation;

    const contactEdge = (source: string, target: string, suffix: string) => {
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
        },
        labelBgStyle: { fill: "hsl(var(--risk-high))", fillOpacity: 1 },
        labelBgPadding: [7, 4] as [number, number],
        labelBgBorderRadius: 9,
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
      contactEdge(fromKey, viaKey, "a");
      contactEdge(viaKey, toKey, "b");
    } else {
      contactEdge(fromKey, toKey, "direct");
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
      rolePill: false,
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
      label: "Admitted ward",
      type: "smoothstep",
      style: { stroke: "hsl(220 13% 78%)", strokeWidth: 1.25 },
      labelStyle: { fill: "hsl(var(--muted-foreground))", fontSize: 10 },
      labelBgStyle: { fill: "hsl(0 0% 100%)", fillOpacity: 0.95 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
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
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <span className="text-[0.8125rem] font-semibold text-foreground">
        Legend:
      </span>
      {(Object.keys(ENTITY_STYLES) as EntityKind[]).map((kind) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-3 rounded", ENTITY_STYLES[kind].dot)} />
          <span className="text-[0.8125rem] text-muted-foreground">
            {ENTITY_STYLES[kind].label}
          </span>
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span
          className="h-0 w-5 border-t-2 border-dashed"
          style={{ borderColor: "hsl(var(--node-infected))" }}
        />
        <span className="text-[0.8125rem] text-muted-foreground">
          High Overlap Contact
        </span>
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
      className={cn("relative w-full bg-background", height)}
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
          className="!rounded-lg !border !border-border !bg-card !shadow-card [&_button]:!h-7 [&_button]:!w-7 [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-muted-foreground [&_button:hover]:!bg-muted"
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={0}
          nodeBorderRadius={3}
          maskColor="hsl(220 23% 97% / 0.7)"
          className="!rounded-lg !border !border-border !bg-card !shadow-card"
          nodeColor={(n) => {
            const kind = (n.data as { kind?: EntityKind })?.kind;
            return kind ? ENTITY_STYLES[kind].minimap : "transparent";
          }}
        />
      </ReactFlow>

      {/* Cluster caption — the membership signal itself is the ring on each node */}
      {built.clusterLabel && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-risk-high px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-node-infected" />
          <span className="text-[0.75rem] font-semibold text-risk-high-foreground">
            {built.clusterLabel}
          </span>
        </div>
      )}

      {/* Node-type filters */}
      <div className="absolute right-4 top-4 z-10 w-[188px] rounded-xl border border-border bg-card p-3.5 shadow-pop">
        <p className="mb-2.5 font-semibold text-foreground">Filters</p>
        <div className="space-y-2">
          {(Object.keys(ENTITY_STYLES) as EntityKind[]).map((kind) => {
            const count = built.counts[kind];
            const absent = count === 0;
            return (
              <label
                key={kind}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 text-[0.8125rem]",
                  absent && "cursor-not-allowed opacity-45"
                )}
              >
                <span className="text-foreground">
                  {ENTITY_STYLES[kind].label}
                  <span className="ml-1 text-muted-foreground">({count})</span>
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
