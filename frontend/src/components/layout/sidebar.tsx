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

/**
 * Only routes that actually exist.
 * Graph Explorer renders the same transmission graph as the detail page,
 * selected by case picker rather than route param.
 */
const navItems = [
  { href: "/",                    label: "Dashboard",         icon: LayoutDashboard, exact: true },
  { href: "/investigations",      label: "Investigations",    icon: FolderSearch },
  { href: "/investigations/new",  label: "New Investigation", icon: PlusCircle, exact: true },
  { href: "/graph",               label: "Graph Explorer",    icon: Network },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md px-1">
      <span
        aria-hidden
        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary shadow-sm"
      >
        <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/95" />
        <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#F97362]" />
      </span>
      <span className="text-[1.0625rem] font-bold tracking-tight text-foreground">
        RogRakshak
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-3.5 z-50 rounded-lg border border-border bg-card p-2 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground active:scale-95 md:hidden"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[1px] md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r border-border bg-card transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-5">
          <Wordmark />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && pathname !== "/investigations/new";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 768 && sidebarOpen) {
                    toggleSidebar();
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] font-medium transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80"
                )}
              >
                {/* Active left accent */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                  />
                )}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ModeToggle />
      </aside>
    </>
  );
}
