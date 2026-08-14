"use client";

import { useEffect, useState } from "react";

type HealthStatus = "loading" | "ok" | "error";

interface HealthData {
  status: string;
  service: string;
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;

    async function checkBackendHealth() {
      try {
        setHealthStatus("loading");
        const response = await fetch(`${apiUrl}/health`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: HealthData = await response.json();
        if (isMounted) {
          setHealthData(data);
          setHealthStatus("ok");
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setHealthStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to connect to backend");
        }
      }
    }

    checkBackendHealth();

    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-teal-500 selection:text-slate-950">
      {/* Background glowing effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            HAI Surveillance & Outbreak Tracing Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
            RogRakshak
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Temporal graph transmission tracking, multi-agent outbreak reasoning, and contact exposure analysis.
          </p>
        </div>

        {/* Backend Status Card */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Backend Connection</span>
            {healthStatus === "loading" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Checking...
              </span>
            )}
            {healthStatus === "ok" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Backend: OK
              </span>
            )}
            {healthStatus === "error" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Backend: Offline
              </span>
            )}
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">API Endpoint:</span>
              <span className="text-slate-300">{apiUrl}/health</span>
            </div>
            {healthData && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service:</span>
                  <span className="text-slate-300">{healthData.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Response:</span>
                  <span className="text-emerald-400 font-bold">{healthData.status}</span>
                </div>
              </>
            )}
            {errorMessage && (
              <div className="flex justify-between text-rose-400">
                <span className="text-slate-500">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Architecture Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-850/50 border border-slate-800 text-left space-y-1">
            <div className="text-xs font-semibold text-slate-200">Postgres + Neo4j</div>
            <div className="text-[11px] text-slate-400">Structured clinical logs & temporal contact graphs</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-850/50 border border-slate-800 text-left space-y-1">
            <div className="text-xs font-semibold text-slate-200">LangGraph + Gemini</div>
            <div className="text-[11px] text-slate-400">Multi-agent investigation & transmission synthesis</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-850/50 border border-slate-800 text-left space-y-1">
            <div className="text-xs font-semibold text-slate-200">@xyflow/react</div>
            <div className="text-[11px] text-slate-400">Interactive outbreak network graph view</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-850/50 border border-slate-800 text-left space-y-1">
            <div className="text-xs font-semibold text-slate-200">Plotly.js Timelines</div>
            <div className="text-[11px] text-slate-400">Patient ward co-location journey tracks</div>
          </div>
        </div>
      </div>
    </main>
  );
}
