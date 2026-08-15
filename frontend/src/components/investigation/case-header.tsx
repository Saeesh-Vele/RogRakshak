"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Building2, Calendar } from "lucide-react";
import type { InvestigationCase } from "@/types/api";
import { StatusBadge } from "@/components/investigation/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { caseStartedAt } from "@/lib/metrics";

function primaryLocation(inv: InvestigationCase): string | null {
  const counts = new Map<string, number>();
  for (const e of inv.evidence) {
    if (e.location) counts.set(e.location, (counts.get(e.location) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

interface CaseHeaderProps {
  investigation: InvestigationCase;
  onRerun: () => void;
  rerunning: boolean;
}

export function CaseHeader({ investigation: inv, onRerun, rerunning }: CaseHeaderProps) {
  const [confirming, setConfirming] = useState(false);
  const started   = caseStartedAt(inv);
  const location  = primaryLocation(inv);
  const startDate = new Date(started.iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Link
        href="/investigations"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-150 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Investigations
      </Link>

      {/* Case header card */}
      <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {/* Case ID + organism */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                {inv.case_id}
                <span className="mx-2 text-muted-foreground/40 font-light">—</span>
                <span className="italic text-foreground/80">{inv.organism}</span>
                {inv.resistance_profile && (
                  <span className="ml-2 font-mono text-[1.25rem] text-muted-foreground">
                    {inv.resistance_profile}
                  </span>
                )}
              </h1>
              <StatusBadge status={inv.status} className="text-sm px-3 py-1" />
            </div>

            {/* Meta strip */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                First event {startDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                Confidence{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {Math.round(inv.confidence * 100)}%
                </span>
              </span>
            </div>
          </div>

          <Button
            onClick={() => setConfirming(true)}
            disabled={rerunning}
            variant="outline"
            className="shrink-0 self-start"
          >
            <RefreshCw className={rerunning ? "animate-spin" : undefined} />
            {rerunning ? "Re-running…" : "Re-run Investigation"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Re-run this investigation?"
        description={
          <>
            This will overwrite the current investigation data for{" "}
            <span className="font-medium text-foreground">{inv.case_id}</span>.
            Evidence, contacts, transmission chains and scoring will all be
            regenerated from the live graph. Continue?
          </>
        }
        confirmLabel="Re-run investigation"
        onCancel={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onRerun(); }}
      />
    </div>
  );
}
