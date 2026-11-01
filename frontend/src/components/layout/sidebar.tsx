"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderSearch,
  LayoutDashboard,
  Network,
  Plus,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/layout/wordmark";
import { ServiceStatus } from "@/components/layout/service-status";

/** Only routes that exist. */
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investigations", label: "Investigations", icon: FolderSearch },
  { href: "/investigations/new", label: "New investigation", icon: Plus },
  { href: "/graph", label: "Graph explorer", icon: Network },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/investigations") {
    return (
      pathname.startsWith("/investigations") &&
      !pathname.startsWith("/investigations/new")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export const SIDEBAR_ID = "app-sidebar";

/**
 * Always visible from md up. Below that it is a drawer opened from the top
 * bar's menu button: closed by default, closed again on every navigation and
 * on Escape, and it hands focus back to the button that opened it.
 */
export function Sidebar() {
  const pathname = usePathname();
  const open = useAppStore((s) => s.sidebarOpen);
  const setOpen = useAppStore((s) => s.setSidebarOpen);
  const firstLink = useRef<HTMLAnchorElement>(null);

  // Navigating closes the drawer
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("sidebar-toggle")?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id={SIDEBAR_ID}
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border bg-background",
          "transition-transform duration-200 ease-out md:w-[220px] md:translate-x-0",
          open ? "translate-x-0 shadow-pop md:shadow-none" : "-translate-x-full max-md:invisible"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-5">
          <Wordmark />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              document.getElementById("sidebar-toggle")?.focus();
            }}
            aria-label="Close navigation"
            className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-sunken hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pt-4">
          <ul className="space-y-px">
            {NAV.map((item, i) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-ui transition-colors duration-100 max-md:h-11",
                      active
                        ? "bg-sunken font-medium text-foreground"
                        : "text-muted-foreground hover:bg-sunken/60 hover:text-foreground"
                    )}
                  >
                    {/* Position marker */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-3 top-2 bottom-2 w-[2px] bg-primary transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <item.icon
                      aria-hidden
                      strokeWidth={1.75}
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ServiceStatus />
      </aside>
    </>
  );
}
