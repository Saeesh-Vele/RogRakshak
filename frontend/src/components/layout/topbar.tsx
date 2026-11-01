"use client";

import { Menu } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { CommandSearch } from "@/components/layout/command-search";
import { UserMenu } from "@/components/layout/user-menu";
import { SIDEBAR_ID } from "@/components/layout/sidebar";
import type { DoctorIdentity } from "@/lib/auth";

/**
 * Search, data-source notice and account. No notification bell: there is no
 * notification source to wire it to, and an inert control is worse than none.
 */
export function Topbar({ doctor }: { doctor: DoctorIdentity | null }) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-8">
      <button
        id="sidebar-toggle"
        type="button"
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-controls={SIDEBAR_ID}
        aria-label="Open navigation"
        className="-ml-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sunken hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <CommandSearch />

      <div className="ml-auto flex items-center gap-3">
        {mode === "mock" && (
          <p className="hidden items-center gap-2 text-meta text-muted-foreground lg:flex">
            <span className="label-caps text-foreground">Fixture data</span>
            <button
              type="button"
              onClick={() => setMode("live")}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Switch to live
            </button>
          </p>
        )}
        <UserMenu doctor={doctor} />
      </div>
    </header>
  );
}
