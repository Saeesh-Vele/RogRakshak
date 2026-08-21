"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { SearchInput } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { DoctorIdentity } from "@/lib/auth";

/**
 * Search is real, not decorative: it drives the same client-side filter the
 * investigations list already implements, via the `q` query param. There is no
 * backend search endpoint, so it deliberately does not pretend to be one.
 */
export function Topbar({ doctor }: { doctor: DoctorIdentity | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  // Keep the field in sync when the query param changes elsewhere
  useEffect(() => {
    if (pathname === "/investigations") {
      setValue(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/investigations?q=${encodeURIComponent(q)}` : "/investigations");
  }

  return (
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center gap-4 border-b border-border bg-card px-6 pl-16 md:pl-6">
      <form onSubmit={submit} className="relative w-full max-w-[420px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground" />
        <SearchInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search cases, organisms, patients…"
          aria-label="Search investigations"
          className="h-10 rounded-lg border-border bg-background pl-10"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          title="No notification service connected"
          disabled
          className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground disabled:opacity-40"
        >
          <Bell className="h-[19px] w-[19px]" />
        </button>
        <span aria-hidden className="mx-1 h-6 w-px bg-border" />
        <UserMenu doctor={doctor} />
      </div>
    </header>
  );
}
