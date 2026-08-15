"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Search, CheckCircle2, ShieldCheck } from "lucide-react";
import { SearchInput } from "@/components/ui/input";

/**
 * Search is real, not decorative: it drives the same client-side filter the
 * investigations list already implements, via the `q` query param.
 */
export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Keep the field in sync when the query param changes elsewhere
  useEffect(() => {
    if (pathname === "/investigations") {
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  // Click outside listener for popovers
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/investigations?q=${encodeURIComponent(q)}` : "/investigations");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card/95 px-6 pl-16 backdrop-blur-sm md:pl-6">
      <form onSubmit={submit} className="relative w-full max-w-[560px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <SearchInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search cases, organisms, patients…"
          aria-label="Search investigations"
          className="pl-10"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowProfile(false);
            }}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95"
          >
            <Bell className="h-[19px] w-[19px]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card p-4 shadow-pop animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Surveillance Alerts
                </span>
                <span className="flex items-center gap-1 text-[0.6875rem] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Live Monitoring
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">Active Outbreak Surveillance</p>
                    <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                      All hospital units (ICU, Medicine, Surgery) actively scanned for transmission clusters.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">System Status: Operational</p>
                    <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                      0 unacknowledged critical system warnings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-label="User profile"
            aria-expanded={showProfile}
            onClick={() => {
              setShowProfile((prev) => !prev);
              setShowNotifications(false);
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-[0.8125rem] font-semibold text-primary transition-all duration-150 hover:ring-2 hover:ring-primary/30 active:scale-95 cursor-pointer"
          >
            DR
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-card p-4 shadow-pop animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-semibold text-sm">
                  DR
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Infection Control Team</p>
                  <p className="text-xs text-muted-foreground truncate">Hospital Epidemiologist</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between py-1">
                  <span>Facility:</span>
                  <span className="font-medium text-foreground">General Hospital</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Department:</span>
                  <span className="font-medium text-foreground">Infection Prevention (IPC)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Surveillance Engine:</span>
                  <span className="font-medium text-primary">RogRakshak v0.1.0</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
