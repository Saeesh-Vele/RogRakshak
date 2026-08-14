"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { GraphEdgeData } from "@/types/graph";

export function CustomContactEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as GraphEdgeData;
  const isHighRisk = edgeData?.riskLevel === "High";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHighRisk ? 3 : 2,
          stroke: isHighRisk ? "#e11d48" : "#94a3b8",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs border transition-all ${
            isHighRisk
              ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100"
              : "bg-white text-slate-700 border-slate-200"
          }`}
        >
          {label || edgeData?.overlapDuration || "Contact Link"}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
