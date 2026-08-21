"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { readStoredTheme, useAppStore } from "@/lib/store";

/**
 * Light / dark switch for the signed-in application.
 *
 * The blocking script in the root layout has already put the right value on
 * <html data-theme> before first paint, so this only reconciles the store with
 * what is already on screen — it never writes on mount, which would undo the
 * script's work and cause a visible flip.
 *
 * The landing and auth screens pin themselves to light, so the preference
 * stored here never reaches them.
 */
export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored !== useAppStore.getState().theme) setTheme(stored);
    // Runs once: the script owns the pre-paint value, the store owns it after.
  }, [setTheme]);

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-pressed={dark}
      // Names the outcome, not the current state — the button is the action.
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {dark ? (
        <Moon className="h-[18px] w-[18px]" />
      ) : (
        <Sun className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
