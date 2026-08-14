import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";

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
    <html lang="en" className={cn("font-sans dark", inter.variable)}>
      <body className="antialiased bg-slate-950 text-slate-100">
        <Sidebar />
        <main className="md:ml-60 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
