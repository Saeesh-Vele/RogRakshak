"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  User,
  Building2,
  Stethoscope,
  Dna,
} from "lucide-react";
import { GraphNodeData } from "@/types/graph";

export const PatientNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as GraphNodeData;
  const isIndex = nodeData.isIndex;
  const isPositive = nodeData.isPositive;

  return (
    <div
      className={`min-w-[180px] rounded-xl border-2 bg-white p-3 shadow-md transition-all ${
        isIndex
          ? "border-rose-500 ring-2 ring-rose-300 bg-gradient-to-b from-rose-50/50 to-white"
          : isPositive
          ? "border-amber-400 bg-gradient-to-b from-amber-50/30 to-white"
          : "border-slate-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-800" />

      <div className="flex items-start gap-2.5">
        <div
          className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
            isIndex
              ? "bg-rose-600 text-white"
              : isPositive
              ? "bg-amber-500 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <User className="size-4" />
        </div>

        <div className="space-y-0.5 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 truncate">
              {nodeData.label}
            </span>
          </div>

          {isIndex ? (
            <span className="inline-block text-[9px] font-extrabold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
              Index Patient
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium block">
              {nodeData.sublabel || nodeData.mrn}
            </span>
          )}

          {nodeData.organism && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 italic pt-0.5">
              <Dna className="size-3 text-teal-600 shrink-0" />
              <span className="truncate">K. pneumoniae ({nodeData.resistance || "MDR"})</span>
            </div>
          )}

          {nodeData.ward && (
            <div className="text-[10px] text-slate-500 truncate">
              {nodeData.ward} {nodeData.bed ? `• ${nodeData.bed}` : ""}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-800" />
    </div>
  );
});
PatientNode.displayName = "PatientNode";

export const StaffNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as GraphNodeData;
  const isVector = nodeData.isVector;

  return (
    <div
      className={`min-w-[190px] rounded-xl border-2 bg-white p-3 shadow-md transition-all ${
        isVector
          ? "border-teal-500 ring-2 ring-teal-300 bg-gradient-to-b from-teal-50/40 to-white"
          : "border-slate-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-700" />

      <div className="flex items-start gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-700 text-white font-bold shrink-0">
          <Stethoscope className="size-4" />
        </div>

        <div className="space-y-0.5 overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-900 truncate">
              {nodeData.label}
            </span>
          </div>

          {isVector ? (
            <span className="inline-block text-[9px] font-extrabold uppercase text-teal-800 bg-teal-100 px-1.5 py-0.2 rounded">
              Intermediary Vector
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium block">
              {nodeData.role}
            </span>
          )}

          <div className="text-[10px] text-slate-600 font-medium leading-tight pt-0.5">
            ICU & Gen Med A crossover
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-teal-700" />
    </div>
  );
});
StaffNode.displayName = "StaffNode";

export const LocationNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as GraphNodeData;

  return (
    <div className="min-w-[150px] rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-slate-200 text-slate-700">
          <Building2 className="size-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-800">
            {nodeData.label}
          </div>
          <div className="text-[9px] text-slate-500">
            {nodeData.sublabel || "Hospital Unit"}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
});
LocationNode.displayName = "LocationNode";
