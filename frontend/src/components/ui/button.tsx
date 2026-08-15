import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  cn(
    // Base
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent",
    "text-sm font-medium whitespace-nowrap select-none",
    // Transitions — fast, professional
    "transition-all duration-150 ease-out",
    // Focus
    "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-45",
    // Icons
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Press feedback — subtle scale on active
    "active:scale-[0.97]"
  ),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 active:bg-primary/85",
        outline:
          "border-border bg-card text-foreground shadow-sm hover:bg-muted hover:border-border/80 active:bg-muted/80",
        secondary:
          "bg-muted text-foreground hover:bg-border active:bg-border/80",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
        soft:
          "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
        destructive:
          "bg-risk-high text-risk-high-foreground hover:bg-risk-high/80 border-risk-high-foreground/20",
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 text-sm [&_svg]:h-4 [&_svg]:w-4",
        sm:      "h-8 px-3 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5",
        lg:      "h-10 px-5 text-sm [&_svg]:h-4 [&_svg]:w-4",
        icon:    "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
        "icon-sm": "h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
