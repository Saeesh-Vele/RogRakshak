import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";
import { NetworkStatic } from "@/components/landing/network-figure";

/**
 * Shell for /login: the form on the left, CASE-2026-001's network on the right
 * (the same static drawing the landing hero uses as its fallback). Public by
 * design; src/middleware.ts bounces signed-in users to the dashboard.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between gap-4 px-5 md:px-10">
          <Wordmark href="/" />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-ui text-muted-foreground transition-colors hover:text-foreground md:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 outline-none sm:items-center sm:pt-0 md:px-10"
        >
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>

      <aside
        aria-label="Example case"
        className="relative hidden flex-col justify-between overflow-hidden border-l border-border bg-sunken p-10 lg:flex"
      >
        <p className="label-caps">Sample data, CASE-2026-001</p>
        <div className="relative mx-auto w-full max-w-[640px]">
          <div
            aria-hidden
            className="bg-graph-dots absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_50%,black,transparent)]"
          />
          <div className="relative aspect-[5/4]">
            <NetworkStatic />
          </div>
        </div>
        <div className="max-w-md">
          <p className="font-display text-title-sm text-foreground">
            One positive culture, one shared nurse, three downstream cases.
          </p>
          <p className="mt-2 text-ui text-muted-foreground">
            Rajesh Verma (red) → Nurse Anita Sharma (teal) → three patients (amber),
            each hop a 12-hour shift overlap. Synthetic data.
          </p>
        </div>
      </aside>
    </div>
  );
}
