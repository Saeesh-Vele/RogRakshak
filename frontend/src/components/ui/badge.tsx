import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Clinical pill badge: tinted background + darker text.
 * Status badges include a leading coloured dot for rapid visual scanning.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-muted text-muted-foreground px-2.5 py-0.5",
        outline:     "border border-border text-muted-foreground px-2.5 py-0.5",
        primary:     "bg-primary-soft text-primary-soft-foreground px-2.5 py-0.5",

        // Risk tiers
        riskHigh:   "bg-risk-high text-risk-high-foreground px-2.5 py-0.5",
        riskMedium: "bg-risk-medium text-risk-medium-foreground px-2.5 py-0.5",
        riskLow:    "bg-risk-low text-risk-low-foreground px-2.5 py-0.5",

        // Investigation statuses — dot indicator variant
        cluster:     "bg-risk-high text-risk-high-foreground px-2.5 py-0.5",
        highPriority:"bg-risk-high text-risk-high-foreground px-2.5 py-0.5",
        potential:   "bg-risk-medium text-risk-medium-foreground px-2.5 py-0.5",
        noSignal:    "bg-risk-low text-risk-low-foreground px-2.5 py-0.5",

        success: "bg-emerald-50 text-emerald-700 px-2.5 py-0.5",
      },
      size: {
        default: "",
        sm:  "px-2 py-px text-[0.6875rem]",
        tier:"px-2 py-px text-[0.6875rem] font-bold tracking-wide uppercase",
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
