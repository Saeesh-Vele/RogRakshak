import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

/**
 * Marketing typeface trio, loaded here but only applied on the public landing
 * page (see src/app/page.tsx). The signed-in product stays on Inter.
 *
 * Newsreader — display. Its italic carries organism names, matching the
 * binomial-nomenclature convention the domain already uses.
 * IBM Plex Sans / Mono — body and data. Plex is drawn for technical and
 * scientific settings, which is the register the product speaks in.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RogRakshak | HAI Surveillance & Outbreak Tracing",
  description:
    "Hospital-acquired infection surveillance, contact tracing, and multi-agent outbreak investigation platform",
};

/**
 * Root layout holds the document shell only. The signed-in application chrome
 * (sidebar + top bar) lives in the (app) route group so the public landing page
 * and the auth screens render without it.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        inter.variable,
        newsreader.variable,
        plexSans.variable,
        plexMono.variable
      )}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
