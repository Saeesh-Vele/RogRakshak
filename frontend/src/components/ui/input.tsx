import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm",
          "placeholder:text-muted-foreground/70",
          "transition-colors duration-150",
          "hover:border-border/70",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:shadow-none",
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

/** Pill-shaped search field — topbar / filter look. */
const SearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="search"
        className={cn(
          "flex h-9 w-full rounded-lg border border-transparent bg-muted px-3.5 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/70",
          "transition-all duration-150",
          "hover:bg-muted/80",
          "focus-visible:outline-none focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/15",
          "[&::-webkit-search-cancel-button]:appearance-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, SearchInput }
