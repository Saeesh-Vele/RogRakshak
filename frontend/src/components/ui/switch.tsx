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
 * Track colour and thumb offset animate together over the same 150ms. The
 * track is 24px tall so the whole control meets the minimum target size, and
 * the off-state track uses --input so its boundary holds 3:1 contrast.
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
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full",
        "transition-colors duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white",
          "shadow-[0_1px_2px_0_rgb(16_24_40_/_0.2)]",
          "transition-transform duration-150 ease-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
