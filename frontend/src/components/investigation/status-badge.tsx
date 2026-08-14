"use client";

import type { InvestigationStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  InvestigationStatus,
  { label: string; variant: "cluster" | "highPriority" | "potential" | "noSignal" }
> = {
  SUSPECTED_CLUSTER: { label: "Suspected Cluster", variant: "cluster" },
  HIGH_PRIORITY_INVESTIGATION: {
    label: "High Priority Investigation",
    variant: "highPriority",
  },
  POTENTIAL_CONTACT: { label: "Potential Contact", variant: "potential" },
  NO_SIGNAL: { label: "No Signal", variant: "noSignal" },
};

interface StatusBadgeProps {
  status: InvestigationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "noSignal" as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
