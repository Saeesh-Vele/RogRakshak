import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-copy text-foreground max-sm:h-11",
          "placeholder:text-muted-foreground",
          "focus-visible:border-primary",
          "aria-[invalid=true]:border-destructive",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

/** Search field for in-page filters. */
const SearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="search"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-copy text-foreground max-sm:h-11",
          "placeholder:text-muted-foreground",
          "focus-visible:border-primary",
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
