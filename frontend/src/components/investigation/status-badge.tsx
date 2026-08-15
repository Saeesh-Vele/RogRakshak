import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvestigationStatus } from "@/types/api";

const STATUS_META: Record<
  InvestigationStatus,
  {
    label: string;
    variant: "cluster" | "highPriority" | "potential" | "noSignal";
    dot: string;
  }
> = {
  HIGH_PRIORITY_INVESTIGATION: {
    label: "High Priority",
    variant: "highPriority",
    dot: "bg-risk-high-foreground",
  },
  SUSPECTED_CLUSTER: {
    label: "Suspected Cluster",
    variant: "cluster",
    dot: "bg-risk-high-foreground",
  },
  POTENTIAL_CONTACT: {
    label: "Potential Contact",
    variant: "potential",
    dot: "bg-risk-medium-foreground",
  },
  NO_SIGNAL: {
    label: "No Signal",
    variant: "noSignal",
    dot: "bg-muted-foreground",
  },
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
    dot: "bg-muted-foreground",
  };
  return (
    <Badge variant={meta.variant} className={className}>
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)}
      />
      {meta.label}
    </Badge>
  );
}
