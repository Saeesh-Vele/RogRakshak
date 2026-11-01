import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

/**
 * Three faces, each with one job.
 *
 * Newsreader — titles and large numerals. A text serif that stays sturdy at
 *   44px figures, and whose italic sets organism names the way the domain
 *   writes them.
 * IBM Plex Sans — every piece of interface text. Drawn for technical and
 *   scientific settings; tabular figures are switched on globally.
 * IBM Plex Mono — anything that is a record: case IDs, MRNs, timestamps,
 *   source record IDs.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  // Next ships no fallback metrics for Newsreader; name a close serif instead.
  fallback: ["Iowan Old Style", "Georgia", "serif"],
  adjustFontFallback: false,
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RogRakshak — HAI surveillance and outbreak tracing",
    template: "%s — RogRakshak",
  },
  description:
    "Hospital-acquired infection surveillance, contact tracing, and multi-agent outbreak investigation platform",
};

export const viewport: Viewport = {
  themeColor: "#F9F8F5",
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
      className={cn(newsreader.variable, plexSans.variable, plexMono.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
