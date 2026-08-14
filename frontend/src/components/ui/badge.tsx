import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-700 text-slate-100",
        secondary:
          "border-transparent bg-slate-800 text-slate-300",
        destructive:
          "border-transparent bg-rose-500/15 text-rose-400 border-rose-500/30",
        outline: "text-slate-300 border-slate-700",
        // Investigation status variants
        cluster:
          "border-transparent bg-amber-500/15 text-amber-300 border-amber-500/30",
        highPriority:
          "border-transparent bg-orange-500/15 text-orange-300 border-orange-500/30",
        potential:
          "border-transparent bg-blue-500/15 text-blue-300 border-blue-500/30",
        noSignal:
          "border-transparent bg-slate-500/15 text-slate-400 border-slate-600/30",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
