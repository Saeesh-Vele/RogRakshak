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
 * Only routes that actually exist — no placeholder destinations.
 * Graph Explorer renders the same single-case transmission graph as the
 * investigation detail page, selected by case picker rather than route param.
 */
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/investigations", label: "Investigations", icon: FolderSearch },
  { href: "/investigations/new", label: "New Investigation", icon: PlusCircle, exact: true },
  { href: "/graph", label: "Graph Explorer", icon: Network },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary"
      >
        <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/95" />
        <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#F97362]" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">
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
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r border-border bg-card transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center px-6">
          <Wordmark />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && pathname !== "/investigations/new";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary-soft-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
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
