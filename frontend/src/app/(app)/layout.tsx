import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getDoctorIdentity } from "@/lib/auth";

/**
 * Chrome for the authenticated application. Access itself is enforced in
 * src/middleware.ts — this layout only renders the signed-in identity.
 */
/**
 * Authenticated pages are per-request by definition — they render a specific
 * doctor's session — so nothing under this segment may be prerendered or
 * cached at build time.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const doctor = await getDoctorIdentity();

  return (
    <>
      <Sidebar />
      <div className="flex min-h-screen flex-col font-body md:ml-[248px]">
        <Suspense
          fallback={<div className="h-[72px] border-b border-border bg-card" />}
        >
          <Topbar doctor={doctor} />
        </Suspense>
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
