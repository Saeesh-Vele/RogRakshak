"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Pill toggle switch.
 *
 * The thumb is positioned from the track's left edge (`left-0.5`) rather than
 * relying on its static position: a `<button>` inherits `text-align: center`
 * from the UA sheet, which Tailwind's preflight does not reset, so an absolutely
 * positioned child with no `left` resolves its static position to the *centre*
 * of the track. That put the thumb mid-track when off and pushed it outside the
 * track when on — the reason the "on" state looked like it had no thumb at all.
 *
 * Track colour and thumb offset animate together over the same 175ms.
 */
export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full",
        "transition-colors duration-[175ms] ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-border",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white",
          "shadow-[0_1px_2px_0_rgb(16_24_40_/_0.2)] ring-1 ring-black/5",
          "transition-transform duration-[175ms] ease-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
