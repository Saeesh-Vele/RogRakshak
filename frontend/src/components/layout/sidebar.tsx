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
 */
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/investigations", label: "Investigations", icon: FolderSearch },
  { href: "/investigations/new", label: "New Investigation", icon: PlusCircle, exact: true },
  { href: "/graph", label: "Graph Explorer", icon: Network },
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
