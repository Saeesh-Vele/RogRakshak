import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";

/**
 * Shell for /login — no sidebar, no top bar. Public by design; see
 * src/middleware.ts, which bounces already-signed-in users to the dashboard.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Wordmark href="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
