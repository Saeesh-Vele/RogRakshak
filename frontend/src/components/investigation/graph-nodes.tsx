"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Building2, User, Stethoscope, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Node roles rendered by the transmission graph.
 *
 * These map 1:1 onto classifications the data already makes:
 *   index        -> investigation.index_patient
 *   downstream   -> investigation.candidate_patients
 *   vector       -> staff mediating a transmission chain hop
 *   location     -> a ward appearing in evidence[].location
 */
export type EntityKind = "index" | "downstream" | "vector" | "location";

export const ENTITY_STYLES: Record<
  EntityKind,
  {
    label: string;
    dot: string;
    border: string;
    iconBg: string;
    pill: string;
    minimap: string;
  }
> = {
  index: {
    label: "Index Patient",
    dot: "bg-node-infected",
    border: "border-node-infected",
    iconBg: "bg-node-infected",
    pill: "bg-risk-high text-risk-high-foreground",
    minimap: "#e05252",
  },
  downstream: {
    label: "Downstream Case",
    dot: "bg-node-downstream",
    border: "border-node-downstream",
    iconBg: "bg-node-downstream",
    pill: "bg-risk-medium text-risk-medium-foreground",
    minimap: "#e0a03a",
  },
  vector: {
    label: "Vector Staff",
    dot: "bg-node-location",
    border: "border-node-location",
    iconBg: "bg-node-location",
    pill: "bg-teal-50 text-node-location",
    minimap: "#2a9d8f",
  },
  location: {
    label: "Ward / Unit",
    dot: "bg-node-neutral",
    border: "border-border",
    iconBg: "bg-node-neutral",
    pill: "bg-muted text-muted-foreground",
    minimap: "#9aa3af",
  },
};

export interface EntityNodeData extends Record<string, unknown> {
  name: string;
  kind: EntityKind;
  /** Role text under the name — a pill for patients/vectors, plain for wards. */
  roleLabel?: string;
  rolePill?: boolean;
  /** e.g. "K. pneumoniae (MDR)" — patients only. */
  organism?: string;
  /** e.g. "Intensive Care Unit (ICU) • Bed 01". */
  placement?: string;
  /** True only for actual members of the identified cluster. */
  inCluster?: boolean;
}

function KindIcon({ kind }: { kind: EntityKind }) {
  const cls = "h-4 w-4 text-white";
  if (kind === "location") return <Building2 className={cls} />;
  if (kind === "vector") return <Stethoscope className={cls} />;
  return <User className={cls} />;
}

/**
 * Card-style node: icon circle, bold name, role pill, organism line, placement
 * line. Cluster membership stays marked on the node itself (dashed ring) —
 * the enclosing region is a bounding box and would otherwise imply membership
 * for any node that merely sits between members.
 */
export function EntityNode({ data }: NodeProps) {
  const { name, kind, roleLabel, rolePill, organism, placement, inCluster } =
    data as EntityNodeData;
  const style = ENTITY_STYLES[kind];
  const isLocation = kind === "location";

  return (
    <div className="relative">
      {inCluster && (
        <span
          aria-hidden
          className="absolute -inset-[6px] rounded-[18px] border-2 border-dashed border-node-infected"
        />
      )}

      <div
        className={cn(
          "relative flex gap-2.5 rounded-xl border-2 bg-card px-3 py-2.5 shadow-card",
          style.border,
          isLocation ? "w-[210px]" : "w-[248px]"
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
        />

        <span
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
            style.iconBg
          )}
        >
          <KindIcon kind={kind} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-bold leading-tight text-foreground">
            {name}
          </p>

          {roleLabel &&
            (rolePill ? (
              <span
                className={cn(
                  "mt-1 inline-block rounded px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide",
                  style.pill
                )}
              >
                {roleLabel}
              </span>
            ) : (
              <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted-foreground">
                {roleLabel}
              </p>
            ))}

          {organism && (
            <p className="mt-1 flex items-center gap-1 text-[0.6875rem] leading-tight text-muted-foreground">
              <FlaskConical className="h-2.5 w-2.5 shrink-0 text-node-location" />
              <span className="truncate italic">{organism}</span>
            </p>
          )}

          {placement && (
            <p className="mt-0.5 text-[0.6875rem] leading-tight text-muted-foreground/80">
              {placement}
            </p>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
        />
      </div>
    </div>
  );
}
