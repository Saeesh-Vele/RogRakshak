"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Search,
  Activity,
  Bell,
  User,
  Network,
  Users,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "Live Investigation",
      href: "/investigate/1",
      icon: Sparkles,
      active: pathname.startsWith("/investigate"),
      badge: "Active Run",
    },
    {
      label: "Patient Directory",
      href: "/patients/1",
      icon: Users,
      active: pathname.startsWith("/patients"),
    },
    {
      label: "Graph Explorer",
      href: "/graph",
      icon: Network,
      active: pathname === "/graph",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Title */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-teal-400 shadow-md group-hover:bg-slate-800 transition-colors">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 font-mono">
                  ROGRAKSHAK
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                  <Activity className="size-3" />
                  HAI Surveillance
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Hospital Infection Intelligence & Outbreak Tracing
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    item.active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 rounded-full bg-teal-400/20 px-1.5 py-0.2 text-[9px] font-bold text-teal-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Search & User / Mock Status Area */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative hidden lg:block w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, MRN, organism..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Live vs Mock indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono">
            <span className="size-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[11px] font-medium">Mock Dataset</span>
          </div>

          {/* Alert Notification */}
          <button
            title="Infection Alerts"
            className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
              1
            </span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
              <User className="size-4" />
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <div className="text-xs font-semibold text-slate-800">Dr. S. Kulkarni</div>
              <div className="text-[10px] text-slate-500">Infection Control Lead</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
