import { ArrowRight, FileText, ShieldAlert } from "lucide-react";

/**
 * Hero graphic: a condensed rendering of the transmission chain the app
 * actually produces, using the fixture case shipped in
 * src/data/mock_investigation_results.json (synthetic data — labelled as such
 * so nothing here implies real patients or real deployments).
 */

function Node({
  label,
  sub,
  tone,
}: {
  label: string;
  sub: string;
  tone: "infected" | "location" | "downstream";
}) {
  const ring = {
    infected: "border-node-infected/40 bg-node-infected/[0.07]",
    location: "border-node-location/40 bg-node-location/[0.07]",
    downstream: "border-node-downstream/50 bg-node-downstream/[0.09]",
  }[tone];
  const dot = {
    infected: "bg-node-infected",
    location: "bg-node-location",
    downstream: "bg-node-downstream",
  }[tone];

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${ring}`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] font-semibold leading-tight text-foreground">
          {label}
        </span>
        <span className="block truncate text-[0.6875rem] leading-tight text-muted-foreground">
          {sub}
        </span>
      </span>
    </div>
  );
}

function Dimension({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[0.75rem] text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-foreground">
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(value / 0.3) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function CasePreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-pop">
      {/* Case header */}
      <div className="flex items-start justify-between gap-3 pb-4">
        <div>
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
            Case CASE-2026-001
          </p>
          <p className="mt-1 text-[0.9375rem] font-bold text-foreground">
            <span className="italic">Klebsiella pneumoniae</span>
            <span className="text-muted-foreground"> · MDR</span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-risk-high px-2.5 py-1 text-[0.6875rem] font-semibold text-risk-high-foreground">
          <ShieldAlert className="h-3 w-3" />
          Suspected cluster
        </span>
      </div>

      {/* Chain */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          Suspected contact pathway
        </p>
        <div className="flex items-center gap-2">
          <Node label="Rajesh Verma" sub="Index patient" tone="infected" />
        </div>
        <div className="flex justify-center py-0.5">
          <ArrowRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" />
        </div>
        <Node
          label="Nurse Anita Sharma"
          sub="Shared clinical intermediary · ICU"
          tone="location"
        />
        <div className="flex justify-center py-0.5">
          <ArrowRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" />
        </div>
        <Node
          label="Suresh Joshi"
          sub="Downstream contact · 720m overlap"
          tone="downstream"
        />
      </div>

      {/* Score */}
      <div className="mt-4 space-y-2.5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
            Weighted score
          </p>
          <p className="text-lg font-bold tabular-nums text-foreground">0.964</p>
        </div>
        <Dimension label="Temporal contact overlap" value={0.276} />
        <Dimension label="Microbiological match" value={0.25} />
        <Dimension label="Resistance phenotype" value={0.2} />
      </div>

      <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-[0.6875rem] leading-snug text-muted-foreground">
        <FileText className="mt-px h-3 w-3 shrink-0" />
        Every figure traces to an atomic evidence item with its source record
        IDs. Synthetic demonstration data.
      </p>
    </div>
  );
}
