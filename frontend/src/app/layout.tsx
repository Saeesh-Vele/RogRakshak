import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RogRakshak | HAI Surveillance & Outbreak Tracing",
  description: "Hospital-acquired infection surveillance, contact tracing, and multi-agent outbreak investigation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased">
        <Sidebar />
        <div className="flex min-h-screen flex-col md:ml-[248px]">
          <Suspense fallback={<div className="h-[72px] border-b border-border bg-card" />}>
            <Topbar />
          </Suspense>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
