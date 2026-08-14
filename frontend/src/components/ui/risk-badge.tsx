import * as React from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { PriorityLevel } from "@/types/patient";
import { cn } from "@/lib/utils";

interface RiskBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  risk?: PriorityLevel | "Critical" | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function RiskBadge({
  risk = "Low",
  size = "md",
  showIcon = true,
  className,
  ...props
}: RiskBadgeProps) {
  const normalized = risk?.toString().toLowerCase();

  let bg = "bg-slate-100";
  let text = "text-slate-700";
  let border = "border-slate-300";
  let icon = <HelpCircle className="size-3.5" />;
  let label = "Unknown";

  if (normalized === "high" || normalized === "critical") {
    bg = "bg-rose-50";
    text = "text-rose-700";
    border = "border-rose-300";
    icon = <AlertCircle className="size-3.5 text-rose-600 shrink-0" />;
    label = "High Risk";
  } else if (normalized === "medium" || normalized === "moderate") {
    bg = "bg-amber-50";
    text = "text-amber-800";
    border = "border-amber-300";
    icon = <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />;
    label = "Medium Risk";
  } else if (normalized === "low" || normalized === "minimal") {
    bg = "bg-emerald-50";
    text = "text-emerald-800";
    border = "border-emerald-300";
    icon = <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />;
    label = "Low Risk";
  }

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[11px] gap-1",
    md: "px-2 py-0.5 text-xs gap-1.5",
    lg: "px-2.5 py-1 text-sm gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold border shadow-xs select-none",
        bg,
        text,
        border,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}
