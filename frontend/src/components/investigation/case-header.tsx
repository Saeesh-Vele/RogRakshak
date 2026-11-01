"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { InvestigationCase } from "@/types/api";
import { StatusBadge } from "@/components/investigation/status-badge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { caseStartedAt } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const SHADES = ["bg-foreground", "bg-foreground/75", "bg-foreground/55", "bg-foreground/40", "bg-foreground/25"];

interface CaseHeaderProps {
  investigation: InvestigationCase;
  onRerun: () => void;
  rerunning: boolean;
}

/**
 * Case header band: breadcrumbs, identity, the confidence figure and a small
 * bar of the five weighted contributions that make it up (the full arithmetic
 * is in the Scoring section). Re-run keeps its confirm-before-overwrite.
 */
export function CaseHeader({ investigation: inv, onRerun, rerunning }: CaseHeaderProps) {
  const [confirming, setConfirming] = useState(false);
  const started = caseStartedAt(inv);
  const pct = (inv.confidence * 100).toFixed(1);

  return (
    <header className="space-y-5">
      <Breadcrumbs items={[{ label: "Investigations", href: "/investigations" }, { label: inv.case_id }]} />

      <div className="grid gap-6 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-ui text-muted-foreground">{inv.case_id}</span>
            <StatusBadge status={inv.status} />
          </p>
          <h1 className="mt-2 font-display text-[2rem] leading-[1.1] tracking-[-0.015em] text-foreground sm:text-[2.5rem]">
            <span className="italic">{inv.organism}</span>
            {inv.resistance_profile && <span className="text-muted-foreground"> {inv.resistance_profile}</span>}
          </h1>
          <p className="mt-2 text-ui text-muted-foreground">
            Index patient <span className="text-foreground">{inv.index_patient.name}</span>{" "}
            <span className="font-mono text-meta">{inv.index_patient.mrn}</span>
            {!started.isFallback && (
              <>
                {" "}
                · first event{" "}
                {new Date(started.iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </>
            )}{" "}
            · {inv.candidate_patients.length} contacts · {inv.transmission_chains.length} chains
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="min-w-[12rem]">
            <p className="label-caps">Confidence</p>
            <p className="mt-1 font-display text-[3rem] leading-none tracking-[-0.02em] text-foreground">
              {pct}
              <span className="text-[1.25rem] text-muted-foreground">%</span>
            </p>
            {/* The five weighted contributions; full working in Scoring */}
            <a href="#scoring" className="mt-2 block rounded-sm" aria-label={`Score breakdown: ${inv.scoring.dimensions.map((d) => `${d.dimension} ${d.weighted_score.toFixed(3)}`).join(", ")}. Jump to scoring.`}>
              <span aria-hidden className="flex h-2 w-48 bg-sunken">
                {inv.scoring.dimensions.map((d, i) => (
                  <span
                    key={d.dimension}
                    className={cn(SHADES[i % SHADES.length], "border-r border-background last:border-r-0")}
                    style={{ width: `${d.weighted_score * 100}%` }}
                  />
                ))}
              </span>
              <span aria-hidden className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground">
                {inv.scoring.dimensions.length} weighted dimensions →
              </span>
            </a>
          </div>
          <Button onClick={() => setConfirming(true)} disabled={rerunning} variant="outline">
            <RefreshCw className={rerunning ? "animate-spin" : undefined} />
            {rerunning ? "Re-running…" : "Re-run"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Re-run ${inv.case_id}?`}
        description={
          <>
            This replaces the stored results for <span className="font-mono text-foreground">{inv.case_id}</span>:
            evidence, contacts, chains and scoring are rebuilt from the live graph. The current results are
            not kept.
          </>
        }
        confirmLabel="Re-run and replace"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onRerun();
        }}
      />
    </header>
  );
}
