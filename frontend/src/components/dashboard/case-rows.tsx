import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { InvestigationCase } from "@/types/api";
import { StatusBadge } from "@/components/investigation/status-badge";
import { caseStartedAt } from "@/lib/metrics";

/**
 * Case rows: identity and status on the left, the confidence as a number and a
 * bar on the right. The bar is ink; the status label carries the risk colour.
 */

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function CaseRows({ cases }: { cases: InvestigationCase[] }) {
  return (
    <ul className="divide-hairline">
      {cases.map((c) => {
        const pct = Math.round(c.confidence * 100);
        const started = caseStartedAt(c);
        return (
          <li key={c.case_id}>
            <Link
              href={`/investigations/${c.case_id}`}
              className="group grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 px-5 py-3.5 transition-colors hover:bg-sunken/60 sm:grid-cols-[minmax(0,1fr)_9.5rem_auto]"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-mono text-ui font-medium text-foreground">{c.case_id}</span>
                  <StatusBadge status={c.status} />
                </p>
                <p className="mt-1 truncate text-ui text-muted-foreground">
                  <span className="text-foreground">{c.index_patient.name}</span> ·{" "}
                  <span className="italic">{c.organism}</span>
                  {c.resistance_profile && ` ${c.resistance_profile}`}
                </p>
                <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                  {c.candidate_patients.length} contact{c.candidate_patients.length === 1 ? "" : "s"} ·{" "}
                  {c.transmission_chains.length} chain{c.transmission_chains.length === 1 ? "" : "s"}
                  {!started.isFallback && ` · first event ${fmtDay(started.iso)}`}
                </p>
              </div>

              <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                <div className="flex items-baseline justify-between">
                  <span className="label-caps">Confidence</span>
                  <span className="font-mono text-ui text-foreground">{pct}%</span>
                </div>
                <div
                  className="mt-1 h-1.5 bg-sunken"
                  role="meter"
                  aria-label={`Confidence ${pct}%`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <ChevronRight
                aria-hidden
                className="col-start-2 row-start-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:col-start-auto sm:row-start-auto"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
