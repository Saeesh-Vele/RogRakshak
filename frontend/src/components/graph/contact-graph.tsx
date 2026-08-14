"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  NodeMouseHandler,
} from "@xyflow/react";
import { Network, X } from "lucide-react";
import { TemporalGraphResponse, GraphNodeData, GraphEdgeData } from "@/types/graph";
import { PatientNode, StaffNode, LocationNode } from "./custom-nodes";
import { CustomContactEdge } from "./custom-edges";
import { GraphLegend } from "./graph-legend";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/risk-badge";

interface ContactGraphProps {
  graphData?: TemporalGraphResponse | null;
  height?: string;
}

const nodeTypes = {
  patientNode: PatientNode,
  staffNode: StaffNode,
  locationNode: LocationNode,
};

const edgeTypes = {
  default: CustomContactEdge,
  contactEdge: CustomContactEdge,
};

export function ContactGraph({
  graphData,
  height = "420px",
}: ContactGraphProps) {
  const [selectedNodeData, setSelectedNodeData] = useState<GraphNodeData | null>(null);

  const initialNodes = useMemo<Node<GraphNodeData>[]>(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((n) => ({
      id: n.id,
      type: n.type || "patientNode",
      position: n.position || { x: 100, y: 100 },
      data: n.data,
    }));
  }, [graphData]);

  const initialEdges = useMemo<Edge<GraphEdgeData>[]>(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "contactEdge",
      animated: e.animated,
      data: e.data,
    }));
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<GraphEdgeData>>(initialEdges);

  // Sync state when graphData updates dynamically from agent pipeline
  React.useEffect(() => {
    if (graphData?.nodes) {
      setNodes(
        graphData.nodes.map((n) => ({
          id: n.id,
          type: n.type || "patientNode",
          position: n.position || { x: 100, y: 100 },
          data: n.data,
        }))
      );
    }
    if (graphData?.edges) {
      setEdges(
        graphData.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: "contactEdge",
          animated: e.animated,
          data: e.data,
        }))
      );
    }
  }, [graphData, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeData(node.data as unknown as GraphNodeData);
  }, []);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-center text-slate-500 text-xs">
          Temporal contact graph will render as the Graph Agent completes multi-hop network synthesis.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Network className="size-4 text-teal-600" />
            <span>Temporal Contact Network & Transmission Pathway</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive multi-hop network showing staff-mediated crossover from ICU to General Medicine A
          </p>
        </div>

        <GraphLegend />
      </CardHeader>

      <CardContent className="p-0 relative" style={{ height }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-lg" />
          <MiniMap
            className="!bg-white !border-slate-200 !rounded-lg !shadow-sm"
            nodeColor={(n) => {
              if (n.type === "staffNode") return "#0f766e";
              if (n.type === "locationNode") return "#94a3b8";
              return "#e11d48";
            }}
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNodeData && (
          <div className="absolute top-3 right-3 z-10 w-72 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-4 shadow-lg animate-in fade-in slide-in-from-right-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {selectedNodeData.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeData(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Entity Type:</span>
                <span className="font-semibold text-slate-800">{selectedNodeData.type}</span>
              </div>
              {selectedNodeData.mrn && (
                <div className="flex justify-between">
                  <span className="text-slate-500">MRN:</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedNodeData.mrn}</span>
                </div>
              )}
              {selectedNodeData.role && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="text-slate-700 font-medium">{selectedNodeData.role}</span>
                </div>
              )}
              {selectedNodeData.ward && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ward / Bed:</span>
                  <span className="text-slate-700 font-medium">
                    {selectedNodeData.ward} {selectedNodeData.bed ? `(${selectedNodeData.bed})` : ""}
                  </span>
                </div>
              )}
              {selectedNodeData.organism && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Organism:</span>
                  <span className="italic font-bold text-teal-800">{selectedNodeData.organism}</span>
                </div>
              )}
              {selectedNodeData.riskLevel && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Risk Assessment:</span>
                  <RiskBadge risk={selectedNodeData.riskLevel} size="sm" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
