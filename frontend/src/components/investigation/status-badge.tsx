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
