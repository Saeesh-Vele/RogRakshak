import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
