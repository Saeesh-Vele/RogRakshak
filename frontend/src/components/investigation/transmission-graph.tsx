"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TransmissionChain } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TransmissionGraphProps {
  chains: TransmissionChain[];
  onSelectEvidence?: (evidenceId: string) => void;
}

function buildGraph(
  chains: TransmissionChain[]
): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map<string, Node>();
  const edges: Edge[] = [];

  let chainIdx = 0;
  for (const chain of chains) {
    chainIdx++;
    const xBase = (chainIdx - 1) * 320;

    chain.nodes.forEach((n, i) => {
      const key = `${n.type}-${n.id}`;
      if (!nodeMap.has(key)) {
        const isPatient = n.type === "patient";
        nodeMap.set(key, {
          id: key,
          position: { x: xBase + 120, y: i * 160 },
          data: {
            label: n.name,
            type: n.type,
            role: n.role,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: isPatient ? "#0f172a" : "#1e293b",
            border: `2px solid ${isPatient ? "#2dd4bf" : "#f59e0b"}`,
            borderRadius: isPatient ? "12px" : "50%",
            color: "#e2e8f0",
            padding: "12px 16px",
            fontSize: "12px",
            fontWeight: 600,
            minWidth: isPatient ? "150px" : "130px",
            textAlign: "center" as const,
          },
        });
      }
    });

    chain.hops.forEach((hop, i) => {
      const fromNode = chain.nodes[i];
      const toNode = chain.nodes[i + 1];
      if (!fromNode || !toNode) return;

      const sourceKey = `${fromNode.type}-${fromNode.id}`;
      const targetKey = `${toNode.type}-${toNode.id}`;
      const edgeId = `${chain.chain_id}-hop-${i}`;

      const durationLabel = hop.overlap_minutes
        ? `${hop.overlap_minutes}m`
        : "";

      edges.push({
        id: edgeId,
        source: sourceKey,
        target: targetKey,
        label: `${durationLabel}\n${hop.location}`,
        style: { stroke: "#475569", strokeWidth: 2 },
        labelStyle: {
          fill: "#94a3b8",
          fontSize: 10,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: "#0f172a",
          fillOpacity: 0.9,
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#475569",
          width: 16,
          height: 16,
        },
        data: { evidenceId: hop.evidence_id },
      });
    });
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}

export function TransmissionGraph({
  chains,
  onSelectEvidence,
}: TransmissionGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(chains),
    [chains]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const evId = (edge.data as Record<string, unknown>)?.evidenceId;
      if (evId && onSelectEvidence) {
        onSelectEvidence(String(evId));
      }
    },
    [onSelectEvidence]
  );

  if (chains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Evidence-Supported Contact Pathways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            No contact pathways identified.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Accessible fallback text
  const fallbackText = chains
    .map((c) => {
      const path = c.nodes.map((n) => n.name).join(" → ");
      return `${c.chain_id}: ${path} (${c.total_overlap_minutes}m total, ${(c.confidence * 100).toFixed(0)}% confidence)`;
    })
    .join("; ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Evidence-Supported Contact Pathways
        </CardTitle>
        <p className="text-xs text-slate-400">
          {chains.length} suspected pathway{chains.length !== 1 ? "s" : ""}{" "}
          identified. Click an edge to view evidence.
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="h-[420px] w-full rounded-lg border border-slate-800 bg-slate-950 overflow-hidden"
          role="img"
          aria-label={`Contact pathway graph: ${fallbackText}`}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={onEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#1e293b"
              gap={20}
              size={1}
            />
            <Controls
              showInteractive={false}
              className="!bg-slate-900 !border-slate-700 !shadow-xl [&_button]:!bg-slate-800 [&_button]:!border-slate-700 [&_button]:!text-slate-300 [&_button:hover]:!bg-slate-700"
            />
            <MiniMap
              nodeColor="#2dd4bf"
              maskColor="rgba(15, 23, 42, 0.8)"
              className="!bg-slate-900 !border-slate-700"
            />
          </ReactFlow>
        </div>

        {/* Textual pathway summary for accessibility / mobile */}
        <div className="mt-3 space-y-2">
          {chains.map((chain) => (
            <div
              key={chain.chain_id}
              className="p-3 rounded-md bg-slate-900/40 border border-slate-800 text-xs text-slate-400"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-teal-400">
                  {chain.chain_id}
                </span>
                <span className="text-slate-500">·</span>
                <span>
                  {chain.total_overlap_minutes}m total ·{" "}
                  {(chain.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {chain.nodes.map((n, i) => (
                  <span key={`${n.type}-${n.id}`} className="flex items-center gap-1">
                    <span
                      className={
                        n.type === "patient"
                          ? "text-teal-300"
                          : "text-amber-300"
                      }
                    >
                      {n.name}
                    </span>
                    {i < chain.nodes.length - 1 && (
                      <span className="text-slate-600">→</span>
                    )}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-slate-500">{chain.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
