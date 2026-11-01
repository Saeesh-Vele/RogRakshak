import type { InvestigationCase } from "@/types/api";
import { StatusBadge } from "@/components/investigation/status-badge";
import { evidenceTier } from "@/lib/risk";

/**
 * The backend's `summary` is a deterministic template (see
 * langgraph_workflow.synthesize_summary) ending in a fixed "Recommended
 * actions: ..." clause, identical for every case. Split the two so the briefing
 * and the standing protocol are presented for what each actually is.
 */
function splitSummary(summary: string): { briefing: string; actions: string[] } {
  const marker = "Recommended actions:";
  const at = summary.indexOf(marker);
  if (at === -1) return { briefing: summary, actions: [] };
  return {
    briefing: summary.slice(0, at).trim(),
    actions: summary
      .slice(at + marker.length)
      .replace(/\.$/, "")
      .split(/,\s*(?:and\s+)?|\s+and\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
  };
}

function exposureWindow(inv: InvestigationCase): string | null {
  const times: number[] = [];
  for (const e of inv.evidence) {
    if (e.start_time) times.push(new Date(e.start_time).getTime());
    if (e.end_time) times.push(new Date(e.end_time).getTime());
  }
  if (times.length === 0) return null;
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

export function ReportCard({ investigation: inv }: { investigation: InvestigationCase }) {
  const { briefing, actions } = splitSummary(inv.summary);
  const window = exposureWindow(inv);
  const highPriority = inv.candidate_patients.filter((p) =>
    inv.evidence.some(
      (e) => evidenceTier(e) === "HIGH" && [e.subject_patient_id, e.object_patient_id].includes(p.id)
    )
  );
  const commonLocation = topBy(inv.evidence, (e) => e.location ?? null);
  const commonStaff = topBy(inv.evidence, (e) => (e.mediator?.type === "staff" ? e.mediator.name : null));

  const facts: [string, React.ReactNode][] = [
    [
      "Assessment",
      <span key="a" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge status={inv.status} />
        <span className="font-mono text-meta text-foreground">{Math.round(inv.confidence * 100)}% confidence</span>
      </span>,
    ],
  ];
  if (window) facts.push(["Exposure window", window]);
  facts.push([
    "High-tier contacts",
    highPriority.length ? (
      <span key="h" className="text-risk-high-foreground">{highPriority.map((p) => p.name).join(", ")}</span>
    ) : (
      "None at high tier"
    ),
  ]);
  if (commonLocation) facts.push(["Common location", commonLocation]);
  if (commonStaff) facts.push(["Common staff", commonStaff]);
  facts.push([
    "Generated",
    <span key="g" className="font-mono text-meta">
      {new Date(inv.generated_at).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>,
  ]);

  return (
    <div className="space-y-6">
      <dl className="divide-hairline border-y border-border">
        {facts.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="label-caps pt-0.5">{k}</dt>
            <dd className="text-ui text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="label-caps text-foreground">Briefing</h3>
        <p className="mt-2 max-w-prose text-copy leading-relaxed text-foreground">{briefing}</p>
      </div>

      {actions.length > 0 && (
        <div>
          <h3 className="label-caps text-foreground">Standing protocol</h3>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-copy text-foreground sm:grid-cols-2">
            {actions.map((a) => (
              <li key={a} className="flex gap-2">
                <span aria-hidden className="text-muted-foreground">—</span>
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-meta text-muted-foreground">
            The same infection-control protocol is returned with every case; it is not derived from
            this case&apos;s evidence.
          </p>
        </div>
      )}

      <p className="text-meta text-muted-foreground">Decision support only. Findings require clinical review.</p>
    </div>
  );
}
