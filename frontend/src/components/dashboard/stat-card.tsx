import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /** Renders the hint in the accent colour when it represents movement. */
  hintTone?: "muted" | "primary" | "high";
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[2.5rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-2.5 text-[0.8125rem]",
            hintTone === "muted" && "text-muted-foreground",
            hintTone === "primary" && "text-primary",
            hintTone === "high" && "text-risk-high-foreground"
          )}
        >
          {hint}
        </p>
      )}
    </Card>
  );
}
