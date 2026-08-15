import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Styled native <select>. Native keeps keyboard/screen-reader behaviour and
 * mobile pickers for free. The chevron is drawn over it since `appearance-none`
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
        "h-9 w-full appearance-none rounded-lg border border-border bg-card py-2 pl-3.5 pr-9 text-sm font-medium text-foreground shadow-sm",
        "transition-colors duration-150",
        "hover:border-border/70 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
    />
  </div>
))
Select.displayName = "Select"

export { Select }
