import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Accent per metric, drawn from the palette already in globals.css. The rail
 * and the icon tint share a hue so the four cards read as a set rather than
 * four identical white boxes.
 */
export type StatAccent = "primary" | "high" | "medium" | "location";

const ACCENT: Record<StatAccent, { rail: string; icon: string }> = {
  primary: {
    rail: "border-l-primary",
    icon: "bg-primary-soft text-primary-soft-foreground",
  },
  high: {
    rail: "border-l-risk-high-foreground/70",
    icon: "bg-risk-high text-risk-high-foreground",
  },
  medium: {
    rail: "border-l-risk-medium-foreground/60",
    icon: "bg-risk-medium text-risk-medium-foreground",
  },
  location: {
    rail: "border-l-node-location",
    icon: "bg-node-location/10 text-node-location",
  },
};

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /** Renders the hint in the accent colour when it represents movement. */
  hintTone?: "muted" | "primary" | "high";
  icon?: LucideIcon;
  accent?: StatAccent;
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
  icon: Icon,
  accent = "primary",
}: StatCardProps) {
  const tone = ACCENT[accent];

  return (
    <Card
      className={cn(
        "border-l-[3px] p-5 transition-shadow hover:shadow-card-hover",
        tone.rail
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
              tone.icon
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>

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
