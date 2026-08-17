import { Badge } from "@/components/ui/badge";
import type { InvestigationStatus } from "@/types/api";

const STATUS_META: Record<
  InvestigationStatus,
  { label: string; variant: "cluster" | "highPriority" | "potential" | "noSignal" }
> = {
  HIGH_PRIORITY_INVESTIGATION: { label: "High Priority", variant: "highPriority" },
  SUSPECTED_CLUSTER: { label: "Suspected Cluster", variant: "cluster" },
  POTENTIAL_CONTACT: { label: "Potential Contact", variant: "potential" },
  NO_SIGNAL: { label: "No Signal", variant: "noSignal" },
};

/**
 * Left-rail colour per status, for list rows that carry a status stripe.
 * Shares the STATUS_META ordering so a row and its badge never disagree.
 */
export const STATUS_RAIL: Record<InvestigationStatus, string> = {
  HIGH_PRIORITY_INVESTIGATION: "bg-node-infected",
  SUSPECTED_CLUSTER: "bg-node-infected",
  POTENTIAL_CONTACT: "bg-node-downstream",
  NO_SIGNAL: "bg-node-neutral",
};

export function StatusBadge({
  status,
  className,
}: {
  status: InvestigationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? {
    label: status,
    variant: "noSignal" as const,
  };
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
