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
        Back to investigations
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {/* The case ID identifies the record; the organism is what the case
              is about, so the organism carries the title. */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">
              {inv.case_id}
            </span>
            <StatusBadge status={inv.status} />
          </div>
          <h1 className="mt-2 font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.015em] text-foreground sm:text-[2.375rem]">
            <span className="italic">{inv.organism}</span>
            {inv.resistance_profile && (
              <span className="text-muted-foreground"> {inv.resistance_profile}</span>
            )}
          </h1>
          <p className="mt-2 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <Button
          onClick={() => setConfirming(true)}
          disabled={rerunning}
          className="shrink-0 self-start"
        >
          <RefreshCw className={rerunning ? "animate-spin" : undefined} />
          {rerunning ? "Re-running…" : "Re-run investigation"}
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
