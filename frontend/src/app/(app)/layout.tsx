import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/toaster";
import { getDoctorIdentity } from "@/lib/auth";

/**
 * Chrome for the authenticated application. Access itself is enforced in
 * src/middleware.ts — this layout only renders the signed-in identity.
 *
 * Authenticated pages are per-request by definition, so nothing under this
 * segment may be prerendered or cached at build time.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const doctor = await getDoctorIdentity();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-[220px]">
        <Topbar doctor={doctor} />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </div>
      <Toaster />
    </>
  );
}
