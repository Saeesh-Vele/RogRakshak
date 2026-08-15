import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Soft pastel pill: tinted background + darker text, never a solid fill.
 * `risk*` variants are the HIGH / MEDIUM / LOW tiers used across evidence,
 * contacts and locations; `status*` variants map investigation statuses.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        primary: "bg-primary-soft text-primary-soft-foreground",

        // Risk tiers
        riskHigh: "bg-risk-high text-risk-high-foreground",
        riskMedium: "bg-risk-medium text-risk-medium-foreground",
        riskLow: "bg-risk-low text-risk-low-foreground",

        // Investigation statuses
        cluster: "bg-risk-high text-risk-high-foreground",
        highPriority: "bg-risk-high text-risk-high-foreground",
        potential: "bg-risk-medium text-risk-medium-foreground",
        noSignal: "bg-risk-low text-risk-low-foreground",

        success: "bg-emerald-50 text-emerald-700",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[0.6875rem]",
        // Uppercase micro-pill used for HIGH / MEDIUM / LOW
        tier: "px-2 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
