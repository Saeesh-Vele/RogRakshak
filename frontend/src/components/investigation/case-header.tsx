"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
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
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

interface CaseHeaderProps {
  investigation: InvestigationCase;
  onRerun: () => void;
  rerunning: boolean;
}

export function CaseHeader({
  investigation: inv,
  onRerun,
  rerunning,
}: CaseHeaderProps) {
  const [confirming, setConfirming] = useState(false);
  const started = caseStartedAt(inv);
  const location = primaryLocation(inv);

  const subtitle = [
    location,
    `First event ${new Date(started.iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <Link
        href="/investigations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Investigations
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-foreground">
              {inv.case_id} —{" "}
              <span className="italic">{inv.organism}</span>
              {inv.resistance_profile && ` ${inv.resistance_profile}`}
            </h1>
            <StatusBadge status={inv.status} />
          </div>
          <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <Button
          onClick={() => setConfirming(true)}
          disabled={rerunning}
          className="shrink-0 self-start"
        >
          <RefreshCw className={rerunning ? "animate-spin" : undefined} />
          {rerunning ? "Re-running…" : "Re-run Investigation"}
        </Button>
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
        onConfirm={() => {
          setConfirming(false);
          onRerun();
        }}
      />
    </div>
  );
}
