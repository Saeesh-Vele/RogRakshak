import { cn } from "@/lib/utils";

/**
 * The four surveillance counters, as one instrument readout rather than four
 * separate cards.
 *
 * Each figure is small (this is a single hospital, not a national dataset), so
 * four big isolated numbers read as padding. Grouped behind one hairline grid
 * they read as a status line you scan left to right, and the qualifier under
 * each figure carries what the number actually means.
 *
 * The hairlines are the 1px grid gap showing the border colour through, which
 * keeps the rules correct at every breakpoint without per-cell border logic.
 */

export type StatTone = "primary" | "high" | "medium" | "location";

const DOT: Record<StatTone, string> = {
  primary: "bg-primary",
  high: "bg-node-infected",
  medium: "bg-node-downstream",
  location: "bg-node-location",
};

export interface StatusStat {
  label: string;
  value: number | string;
  hint: string;
  tone: StatTone;
  /** Renders the hint in the stat's own colour when it reports movement. */
  emphasiseHint?: boolean;
}

const HINT_TONE: Record<StatTone, string> = {
  primary: "text-primary",
  high: "text-node-infected",
  medium: "text-risk-medium-foreground",
  location: "text-node-location",
};

export function StatusBand({ stats }: { stats: StatusStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card px-5 py-4">
          <p className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[stat.tone])}
            />
            {stat.label}
          </p>
          <p className="mt-3 font-display text-[2.5rem] font-normal leading-none tabular-nums text-foreground">
            {stat.value}
          </p>
          <p
            className={cn(
              "mt-2.5 truncate text-[0.8125rem]",
              stat.emphasiseHint
                ? HINT_TONE[stat.tone]
                : "text-muted-foreground"
            )}
            title={stat.hint}
          >
            {stat.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
