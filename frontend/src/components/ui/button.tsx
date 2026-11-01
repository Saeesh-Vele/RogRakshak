import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * One filled style (the accent) for the primary action on a screen; everything
 * else is outline, quiet or a link. Below the sm breakpoint every size grows to
 * a 44px touch target.
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent",
    "text-ui font-medium whitespace-nowrap select-none transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:h-4 [&_svg]:w-4"
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border-border bg-card text-foreground hover:border-input hover:bg-sunken",
        secondary: "bg-sunken text-foreground hover:bg-border",
        ghost: "text-muted-foreground hover:bg-sunken hover:text-foreground",
        soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 max-sm:min-h-11",
        sm: "h-8 px-3 max-sm:min-h-11",
        lg: "h-10 px-4 text-copy max-sm:min-h-11",
        icon: "h-9 w-9 max-sm:min-h-11 max-sm:min-w-11",
        "icon-sm": "h-8 w-8 max-sm:min-h-11 max-sm:min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(function Button({ className, variant = "default", size = "default", ...props }, ref) {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { Button, buttonVariants }
