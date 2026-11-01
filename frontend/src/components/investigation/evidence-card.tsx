"use client";

import type { EvidenceItem } from "@/types/api";
import { formatMinutes } from "@/lib/risk";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The body of an evidence item: the explanation, then its facts as a record
 * (location, overlap, intermediary, window) and its provenance — the source and
 * the record IDs it was computed from. Revealed by the rows in EvidenceList.
 */
export function EvidenceDetail({ item }: { item: EvidenceItem }) {
  const facts: [string, React.ReactNode][] = [];
  if (item.location) facts.push(["Location", item.location]);
  if (item.overlap_minutes != null) facts.push(["Overlap", formatMinutes(item.overlap_minutes)]);
  if (item.mediator)
    facts.push([
      "Via",
      `${item.mediator.name}${item.mediator.role ? ` (${item.mediator.role})` : ""}`,
    ]);
  if (item.start_time)
    facts.push([
      "Window",
      `${formatDateTime(item.start_time)}${item.end_time ? ` → ${formatDateTime(item.end_time)}` : ""}`,
    ]);
  facts.push(["Source", item.source]);
  const ids = Object.entries(item.source_record_ids);

  return (
    <>
      <p className="max-w-3xl text-copy text-muted-foreground">{item.explanation}</p>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-[7rem_1fr]">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="label-caps">{k}</dt>
            <dd className="text-ui text-foreground">{v}</dd>
          </div>
        ))}
        <dt className="label-caps">Records</dt>
        <dd className="font-mono text-meta text-foreground">
          {ids.length ? (
            ids.map(([k, v]) => (
              <span key={k} className="mr-3 inline-block">
                {k}: {String(v)}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">
              None recorded: derived from the lab-report cohort
            </span>
          )}
        </dd>
        <dt className="label-caps">Evidence ID</dt>
        <dd className="font-mono text-meta text-muted-foreground">{item.evidence_id}</dd>
      </dl>
    </>
  );
}
