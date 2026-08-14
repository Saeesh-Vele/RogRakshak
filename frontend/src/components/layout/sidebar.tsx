"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  PlusCircle,
  Shield,
  Menu,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investigations", label: "Investigations", icon: Search },
  { href: "/investigations/new", label: "New Investigation", icon: PlusCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, mode, setMode } = useAppStore();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-300 md:hidden"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-60 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Branding */}
        <div className="p-5 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-400" />
            <span className="text-lg font-bold bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
              RogRakshak
            </span>
          </Link>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
            Infection Investigation
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mode toggle */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setMode(mode === "mock" ? "live" : "mock")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            aria-label={`Switch to ${mode === "mock" ? "live" : "mock"} mode`}
          >
            {mode === "mock" ? (
              <ToggleLeft className="w-4 h-4 text-amber-400" />
            ) : (
              <ToggleRight className="w-4 h-4 text-emerald-400" />
            )}
            <span>
              Mode:{" "}
              <span
                className={
                  mode === "mock" ? "text-amber-400" : "text-emerald-400"
                }
              >
                {mode === "mock" ? "Mock" : "Live"}
              </span>
            </span>
          </button>
          {mode === "mock" && (
            <div className="mt-2 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
              ⚠ Using pre-computed fixture data
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
