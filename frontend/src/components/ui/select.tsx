import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Styled native <select>. Native keeps keyboard/screen-reader behaviour and
 * mobile pickers for free; the chevron is drawn over it since `appearance-none`
 * removes the platform one.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative inline-flex w-full">
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-border bg-card py-2 pl-3.5 pr-9 text-sm font-medium text-foreground",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
))
Select.displayName = "Select"

export { Select }
