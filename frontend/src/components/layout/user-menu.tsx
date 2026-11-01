"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LogOut } from "lucide-react";

import type { DoctorIdentity } from "@/lib/auth";
import { useAppStore, type DataMode } from "@/lib/store";
import { cn } from "@/lib/utils";

const SOURCES: { value: DataMode; label: string; hint: string }[] = [
  { value: "live", label: "Live service", hint: "Analysis backend" },
  { value: "mock", label: "Fixture data", hint: "Offline sample case" },
];

/**
 * Identity, data source and sign-out.
 *
 * Follows the menu-button pattern: Enter / Space / ArrowDown opens it on the
 * first item, arrows move between items, Escape or Tab closes it, and focus
 * returns to the button. Sign-out posts to /auth/signout so the session
 * cookies are cleared server-side before the redirect.
 */
export function UserMenu({ doctor }: { doctor: DoctorIdentity | null }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  const items = useCallback(
    () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []
      ),
    []
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, items, close]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  if (!doctor) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${doctor.name}`}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-md pl-1 pr-1.5 transition-colors max-sm:h-11 sm:pr-2.5",
          open ? "bg-sunken" : "hover:bg-sunken"
        )}
      >
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-card font-mono text-[0.6875rem] font-medium text-foreground"
        >
          {doctor.initials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[180px] truncate text-ui font-medium leading-tight text-foreground">
            {doctor.name}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "hidden h-3.5 w-3.5 text-muted-foreground transition-transform sm:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 animate-fade-in overflow-hidden rounded-lg border border-border bg-popover shadow-pop"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-ui font-medium text-foreground">
              {doctor.name}
            </p>
            <p className="truncate text-meta text-muted-foreground">
              {doctor.role}
            </p>
            <p className="mt-0.5 truncate font-mono text-meta text-muted-foreground">
              {doctor.email}
            </p>
          </div>

          <div role="group" aria-labelledby={`${menuId}-src`} className="border-b border-border py-1.5">
            <p id={`${menuId}-src`} className="label-caps px-4 pb-1 pt-1">
              Data source
            </p>
            {SOURCES.map((src) => {
              const checked = mode === src.value;
              return (
                <button
                  key={src.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  tabIndex={-1}
                  onClick={() => {
                    setMode(src.value);
                    close();
                  }}
                  className="flex min-h-10 w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-sunken focus-visible:bg-sunken"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center">
                    {checked && <Check aria-hidden className="h-4 w-4 text-primary" />}
                  </span>
                  <span>
                    <span className="block text-ui text-foreground">{src.label}</span>
                    <span className="block text-meta text-muted-foreground">
                      {src.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* role="none" so the form does not sit between role="menu" and its
              menuitem — otherwise the item is dropped from the a11y tree. */}
          <form
            action="/auth/signout"
            method="post"
            role="none"
            onSubmit={() => setSigningOut(true)}
            className="py-1.5"
          >
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={signingOut || undefined}
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-ui text-foreground transition-colors hover:bg-sunken focus-visible:bg-sunken"
            >
              <LogOut aria-hidden className="h-4 w-4 text-muted-foreground" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
