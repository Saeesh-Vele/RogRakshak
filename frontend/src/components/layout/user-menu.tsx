"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";

import type { DoctorIdentity } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Top-bar identity + sign-out. Replaces the inert "DR" avatar placeholder: the
 * name and role come from Supabase user metadata collected at sign-up.
 *
 * Sign-out posts to the /auth/signout route handler rather than calling
 * supabase.auth.signOut() in the browser, so the session cookies are cleared
 * server-side and the redirect is already unauthenticated by the time
 * middleware sees it.
 */
export function UserMenu({ doctor }: { doctor: DoctorIdentity | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!doctor) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${doctor.name}`}
        className={cn(
          "flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors sm:rounded-lg sm:pr-3",
          open ? "bg-muted" : "hover:bg-muted"
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.8125rem] font-semibold text-primary-soft-foreground">
          {doctor.initials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-[0.8125rem] font-semibold leading-tight text-foreground">
            {doctor.name}
          </span>
          <span className="block truncate text-[0.75rem] leading-tight text-muted-foreground">
            {doctor.role}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-60 animate-fade-in overflow-hidden rounded-xl border border-border bg-popover shadow-pop"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {doctor.name}
            </p>
            <p className="truncate text-[0.8125rem] text-muted-foreground">
              {doctor.role}
            </p>
            <p className="mt-1 truncate text-[0.75rem] text-muted-foreground">
              {doctor.email}
            </p>
          </div>
          {/* role="none" so the form does not sit between role="menu" and its
              menuitem — otherwise the item is dropped from the a11y tree. */}
          <form action="/auth/signout" method="post" role="none">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
