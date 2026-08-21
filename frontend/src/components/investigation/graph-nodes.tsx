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
    iconBg: string;
    /** Tinted role strip across the top of an actor card. */
    stripBg: string;
    stripText: string;
  }
> = {
  index: {
    label: "Index patient",
    dot: "bg-node-infected",
    iconBg: "bg-node-infected",
    stripBg: "bg-node-infected/[0.08]",
    stripText: "text-risk-high-foreground",
  },
  downstream: {
    label: "Downstream case",
    dot: "bg-node-downstream",
    iconBg: "bg-node-downstream",
    stripBg: "bg-node-downstream/[0.10]",
    stripText: "text-risk-medium-foreground",
  },
  vector: {
    label: "Vector staff",
    dot: "bg-node-location",
    iconBg: "bg-node-location",
    stripBg: "bg-node-location/[0.09]",
    // --node-location itself is too light for 9px uppercase type on a
    // near-white strip; the -strong token is darkened in light mode and
    // brightened in dark, so the strip holds contrast either way.
    stripText: "text-node-location-strong",
  },
  location: {
    label: "Ward / unit",
    dot: "bg-node-neutral",
    iconBg: "bg-node-neutral",
    stripBg: "bg-muted",
    stripText: "text-muted-foreground",
  },
};

export interface EntityNodeData extends Record<string, unknown> {
  name: string;
  kind: EntityKind;
  /** Role text — rendered in the card's top strip, or as the ward's subtitle. */
  roleLabel?: string;
  /** e.g. "K. pneumoniae (MDR)" — patients only. */
  organism?: string;
  /** e.g. "Intensive Care Unit (ICU) • Bed 01". */
  placement?: string;
  /** True only for actual members of the identified cluster. */
  inCluster?: boolean;
}

/** Shared lift so cards read as objects sitting on the dotted canvas. */
const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(16,24,40,0.05),0_6px_16px_-6px_rgba(16,24,40,0.16)]";

function KindIcon({ kind }: { kind: EntityKind }) {
  const cls = "h-[15px] w-[15px] text-white";
  if (kind === "location") return <Building2 className={cls} />;
  if (kind === "vector") return <Stethoscope className={cls} />;
  return <User className={cls} />;
}

/**
 * Two card shapes, because the graph holds two different kinds of thing.
 *
 * Actors (index, downstream, vector) get a tinted role strip that does the
 * colour-coding, so the card body itself can stay on a hairline border rather
 * than the 2px coloured outline it used to carry — which competed with the
 * dashed cluster ring drawn immediately outside it.
 *
 * Wards are context, not actors: they get a smaller, quieter card with no
 * strip, so the eye reads the chain first and the places second.
 */
export function EntityNode({ data }: NodeProps) {
  const { name, kind, roleLabel, organism, placement, inCluster } =
    data as EntityNodeData;
  const style = ENTITY_STYLES[kind];

  if (kind === "location") {
    return (
      <div
        className={cn(
          "flex w-[186px] items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5",
          CARD_SHADOW
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
        />
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted">
          <Building2 className="h-[15px] w-[15px] text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.75rem] font-medium leading-tight text-muted-foreground">
            {name}
          </p>
          {roleLabel && (
            <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted-foreground/70">
              {roleLabel}
            </p>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {inCluster && (
        <span
          aria-hidden
          className="absolute -inset-[7px] rounded-[17px] border border-dashed border-node-infected/55"
        />
      )}

      <div
        className={cn(
          "relative w-[234px] overflow-hidden rounded-xl border border-border bg-card",
          CARD_SHADOW
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!h-1.5 !w-1.5 !border-0 !bg-transparent"
        />

        {roleLabel && (
          <p
            className={cn(
              "flex items-center gap-2 border-b border-border px-3 py-[7px] font-mono text-[0.5625rem] uppercase tracking-[0.13em]",
              style.stripBg,
              style.stripText
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {roleLabel}
          </p>
        )}

        <div className="flex gap-2.5 px-3 py-2.5">
          <span
            className={cn(
              "mt-px grid h-7 w-7 shrink-0 place-items-center rounded-lg",
              style.iconBg
            )}
          >
            <KindIcon kind={kind} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-semibold leading-tight text-foreground">
              {name}
            </p>

            {organism && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[0.6875rem] leading-tight text-muted-foreground">
                <FlaskConical className="h-2.5 w-2.5 shrink-0 text-node-location" />
                <span className="truncate italic">{organism}</span>
              </p>
            )}

            {placement && (
              <p className="mt-1 truncate font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-muted-foreground/75">
                {placement}
              </p>
            )}
          </div>
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
