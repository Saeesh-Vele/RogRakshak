import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RogRakshak | Hospital Infection Intelligence & Outbreak Tracing",
  description:
    "Clinical hospital-acquired infection surveillance, temporal contact tracing, and multi-agent outbreak investigation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col selection:bg-teal-500 selection:text-white">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="w-full border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">RogRakshak Clinical Platform</span>
              <span>•</span>
              <span>Infection Control & HAI Outbreak Reasoning</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Plant Scenario: ICU → Gen Med A (K. pneumoniae MDR)</span>
              <span>•</span>
              <span className="text-teal-700 font-medium">Phase 3 Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
