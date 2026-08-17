"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderSearch,
  Network,
  PlusCircle,
  Menu,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { Wordmark } from "@/components/layout/wordmark";

/**
 * Only routes that actually exist — no placeholder destinations.
 * Graph Explorer renders the same single-case transmission graph as the
 * investigation detail page, selected by case picker rather than route param.
 *
 * Grouped by what the route does rather than alphabetically: "Monitor" is
 * where you read the current picture, "Investigate" is where you start or
 * follow a specific chain. The split is real, so it earns its labels.
 */
const navGroups = [
  {
    label: "Monitor",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      { href: "/investigations", label: "Investigations", icon: FolderSearch },
    ],
  },
  {
    label: "Investigate",
    items: [
      {
        href: "/investigations/new",
        label: "New investigation",
        icon: PlusCircle,
        exact: true,
      },
      { href: "/graph", label: "Graph explorer", icon: Network },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-3.5 z-50 rounded-lg border border-border bg-card p-2 text-muted-foreground shadow-card md:hidden"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/*
       * The chrome sits on ink so the working area reads as the lit surface —
       * the same ink the marketing page uses for its instrument panels, so
       * signing in is a change of register rather than a change of product.
       */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col bg-ink transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center border-b border-ink-line px-6">
          <Wordmark tone="light" />
        </div>

        <nav
          className="flex-1 space-y-7 overflow-y-auto px-3 py-6"
          aria-label="Main navigation"
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/30">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href) &&
                      pathname !== "/investigations/new";
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg py-2.5 pl-3 pr-3 text-[0.875rem] transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                          active
                            ? "bg-white/[0.07] font-medium text-white"
                            : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
                        )}
                      >
                        {/* Position marker — the one place the rail appears */}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary transition-opacity",
                            active ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active ? "text-primary" : "text-white/40"
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <ModeToggle />
      </aside>
    </>
  );
}
