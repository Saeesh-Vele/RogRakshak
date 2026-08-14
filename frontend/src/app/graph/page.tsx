"use client";

import { useState, useEffect, useMemo } from "react";
import { Network, Filter, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { TemporalGraphResponse } from "@/types/graph";
import { ContactGraph } from "@/components/graph/contact-graph";
import { mockTemporalGraph } from "@/mocks/graph";

export default function GraphExplorerPage() {
  const [graphData, setGraphData] = useState<TemporalGraphResponse | null>(mockTemporalGraph);
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [selectedRisk, setSelectedRisk] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getSubgraph(1);
        if (res && res.graph) {
          setGraphData(res.graph);
        }
      } catch (err) {
        console.error("Failed to load full graph:", err);
      }
    }
    load();
  }, []);

  // Filter nodes according to selection
  const filteredGraph = useMemo(() => {
    if (!graphData) return null;

    let filteredNodes = graphData.nodes;

    if (selectedWard !== "ALL") {
      filteredNodes = filteredNodes.filter(
        (n) => n.data.ward === selectedWard || n.data.type === "Staff" || n.data.label.includes(selectedWard)
      );
    }

    if (selectedType !== "ALL") {
      filteredNodes = filteredNodes.filter((n) => n.data.type === selectedType);
    }

    if (selectedRisk !== "ALL") {
      filteredNodes = filteredNodes.filter((n) => n.data.riskLevel === selectedRisk);
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [graphData, selectedWard, selectedType, selectedRisk]);

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              Hospital Outbreak Contact Graph Explorer
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <Network className="size-3" /> Neo4j Subgraph Explorer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full-canvas interactive topological network of patient movements, staff crossovers, and ward links.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedWard("ALL");
            setSelectedType("ALL");
            setSelectedRisk("ALL");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Filter className="size-4 text-teal-600" />
          <span>Filters:</span>
        </div>

        {/* Ward Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Ward:</span>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Units</option>
            <option value="Intensive Care Unit (ICU)">ICU</option>
            <option value="General Medicine A">General Medicine A</option>
            <option value="Surgical Ward">Surgical Ward</option>
          </select>
        </div>

        {/* Entity Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Entity Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Entities</option>
            <option value="Patient">Patients Only</option>
            <option value="Staff">Staff Only</option>
            <option value="Ward">Wards Only</option>
          </select>
        </div>

        {/* Risk Level Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Risk Level:</span>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="High">High Risk Only</option>
            <option value="Medium">Medium Risk Only</option>
            <option value="Low">Low Risk Only</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500 font-mono">
          Showing {filteredGraph?.nodes.length || 0} nodes / {filteredGraph?.edges.length || 0} edges
        </div>
      </div>

      {/* Main Full Graph Canvas */}
      <ContactGraph graphData={filteredGraph} height="580px" />
    </div>
  );
}
