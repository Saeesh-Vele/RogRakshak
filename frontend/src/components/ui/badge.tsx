import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * A typographic status marker, not a pill: a small uppercase label led by a
 * glyph whose *shape* also encodes the level — filled square for high / cluster,
 * hollow square for medium / potential, a dash for low / no signal — so the
 * meaning survives without colour. Colour is only ever red or amber when the
 * label itself says HIGH, MEDIUM, cluster or potential contact.
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap font-medium uppercase leading-none tracking-[0.07em]",
    "before:shrink-0 before:content-['']"
  ),
  {
    variants: {
      variant: {
        default: "text-muted-foreground before:hidden",
        outline:
          "rounded-sm border border-border px-1.5 py-1 text-muted-foreground normal-case tracking-normal before:hidden",
        primary: "text-primary before:hidden",

        // Risk tiers
        riskHigh: "text-risk-high-foreground before:h-[7px] before:w-[7px] before:bg-current",
        riskMedium:
          "text-risk-medium-foreground before:h-[7px] before:w-[7px] before:border-[1.5px] before:border-current",
        riskLow: "text-muted-foreground before:h-[1.5px] before:w-2 before:bg-current",

        // Investigation statuses
        cluster: "text-risk-high-foreground before:h-[7px] before:w-[7px] before:bg-current",
        highPriority: "text-risk-high-foreground before:h-[7px] before:w-[7px] before:bg-current",
        potential:
          "text-risk-medium-foreground before:h-[7px] before:w-[7px] before:border-[1.5px] before:border-current",
        noSignal: "text-muted-foreground before:h-[1.5px] before:w-2 before:bg-current",

        success: "text-success before:h-[7px] before:w-[7px] before:rounded-full before:bg-current",
      },
      size: {
        default: "text-[0.6875rem]",
        sm: "text-[0.6875rem]",
        tier: "text-[0.6875rem] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
