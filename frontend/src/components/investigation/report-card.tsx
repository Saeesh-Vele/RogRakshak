"use client";

import type { InvestigationCase } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/investigation/status-badge";
import { evidenceTier } from "@/lib/risk";
import { CheckCircle2 } from "lucide-react";

function splitSummary(summary: string): { briefing: string; actions: string[] } {
  const marker = "Recommended actions:";
  const at = summary.indexOf(marker);
  if (at === -1) return { briefing: summary, actions: [] };

  const briefing = summary.slice(0, at).trim();
  const actions = summary
    .slice(at + marker.length)
    .replace(/\.$/, "")
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return { briefing, actions };
}

function exposureWindow(inv: InvestigationCase): string | null {
  const times: number[] = [];
  for (const e of inv.evidence) {
    if (e.start_time) times.push(new Date(e.start_time).getTime());
    if (e.end_time)   times.push(new Date(e.end_time).getTime());
  }
  if (times.length === 0) return null;

  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  return `${fmt(Math.min(...times))} – ${fmt(Math.max(...times))}`;
}

function topBy<T>(items: T[], key: (t: T) => string | null): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
      <p className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground sm:w-[200px]">
        {label}
      </p>
      <div className="min-w-0 flex-1 text-[0.9rem] text-foreground">{children}</div>
    </div>
  );
}

export function ReportCard({ investigation: inv }: { investigation: InvestigationCase }) {
  const { briefing, actions } = splitSummary(inv.summary);
  const window = exposureWindow(inv);

  const highPriority = inv.candidate_patients.filter((p) =>
    inv.evidence.some(
      (e) =>
        evidenceTier(e) === "HIGH" &&
        [e.subject_patient_id, e.object_patient_id].includes(p.id)
    )
  );

  const commonLocation = topBy(inv.evidence, (e) => e.location ?? null);
  const commonStaff = topBy(inv.evidence, (e) =>
    e.mediator?.type === "staff" ? e.mediator.name : null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Investigation Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generated{" "}
          {new Date(inv.generated_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </CardHeader>

      <CardContent>
        <div>
          <Row label="Case">
            <span className="font-semibold">{inv.case_id}</span>
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            <span className="italic text-muted-foreground">{inv.organism}</span>
            {inv.resistance_profile && (
              <span className="ml-1 font-mono text-muted-foreground">
                {inv.resistance_profile}
              </span>
            )}
          </Row>

          {window && <Row label="Exposure Window">{window}</Row>}

          <Row label="High-Priority Contacts">
            {highPriority.length === 0 ? (
              <span className="text-muted-foreground">None at high tier</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {highPriority.map((p) => (
                  <Badge key={p.id} variant="riskHigh">{p.name}</Badge>
                ))}
              </span>
            )}
          </Row>

          {commonLocation && <Row label="Common Location">{commonLocation}</Row>}
          {commonStaff     && <Row label="Common Staff">{commonStaff}</Row>}

          <Row label="Assessment">
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={inv.status} />
              <span className="font-semibold text-foreground tabular-nums">
                {Math.round(inv.confidence * 100)}%
              </span>
              <span className="text-muted-foreground">confidence</span>
            </span>
          </Row>

          <Row label="Briefing">
            <p className="leading-relaxed text-muted-foreground">{briefing}</p>
          </Row>

          {actions.length > 0 && (
            <Row label="Standing Protocol">
              <ul className="space-y-2">
                {actions.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{a}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.8125rem] italic text-muted-foreground/70">
                Fixed infection-control protocol returned with every case — not
                derived from this case&apos;s evidence.
              </p>
            </Row>
          )}
        </div>

        <p className="mt-4 rounded-lg bg-risk-medium/60 px-3.5 py-2.5 text-[0.8125rem] font-medium text-risk-medium-foreground">
          ⚕ Decision support only — all findings require clinical review before action.
        </p>
      </CardContent>
    </Card>
  );
}
