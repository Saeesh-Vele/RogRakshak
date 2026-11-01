import { cn } from "@/lib/utils";

/**
 * The dashboard's headline figures: large serif numerals on a single ruled
 * band, no boxes. A figure is only coloured when its meaning is risk.
 */

export interface Stat {
  label: string;
  value: number;
  sub: React.ReactNode;
  /** Paint the numeral in the risk colour — only for genuine risk counts. */
  risk?: boolean;
}

export function StatRow({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 border-y border-border lg:grid-cols-4",
        className
      )}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            "py-5 pr-4",
            // Vertical rules between figures, wrapping cleanly at 2 columns
            i % 2 === 1 && "border-l border-border pl-5",
            i >= 2 && "border-t border-border lg:border-t-0",
            i === 2 && "lg:border-l lg:pl-5"
          )}
        >
          <dt className="label-caps">{s.label}</dt>
          <dd>
            <span
              className={cn(
                "mt-2 block font-display text-[2.75rem] leading-none tracking-[-0.02em] sm:text-[3.25rem]",
                s.risk ? "text-risk-high-foreground" : "text-foreground"
              )}
            >
              {s.value}
            </span>
            <span className="mt-2 block text-ui text-muted-foreground">{s.sub}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
