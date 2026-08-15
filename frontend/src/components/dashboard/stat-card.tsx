import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  hintTone?: "muted" | "primary" | "high";
  href?: string;
  /** Optional small icon to reinforce the metric */
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
  href,
  icon,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-all duration-150",
        href &&
          "cursor-pointer hover:border-primary/30 hover:shadow-card-hover active:scale-[0.99]"
      )}
    >
      {/* Top row: label + optional icon */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            {icon}
          </span>
        )}
      </div>

      {/* Big value */}
      <p className="mt-3 text-[2.25rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </p>

      {/* Separator */}
      {hint && <div className="mt-3.5 h-px bg-border" />}

      {/* Hint */}
      {hint && (
        <p
          className={cn(
            "mt-3 text-[0.8125rem]",
            hintTone === "muted" && "text-muted-foreground",
            hintTone === "primary" && "font-medium text-primary",
            hintTone === "high" && "font-medium text-risk-high-foreground"
          )}
        >
          {hint}
        </p>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
