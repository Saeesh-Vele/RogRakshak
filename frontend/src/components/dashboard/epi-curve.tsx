import type { TrendPoint } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/**
 * Epidemic curve: confirmed positive cultures per calendar day, from the first
 * positive to the last.
 *
 * Built for small numbers. Each day is a fixed-width column, so six days of
 * data occupy six columns instead of being stretched across the panel, and
 * every bar carries its count. Days with no positive are real zeros and are
 * drawn as such. With fewer than three dated positives there is no curve to
 * speak of, so the dates are listed instead.
 *
 * Screen readers get the same data as a table.
 */

const BAR_MAX = 120; // px for the tallest day

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function EpiCurve({ points }: { points: TrendPoint[] }) {
  const total = points.at(-1)?.cumulative ?? 0;
  const positiveDays = points.filter((p) => p.count > 0);

  if (total === 0) {
    return (
      <p className="px-5 py-8 text-ui text-muted-foreground">
        No positive cultures with a recorded date yet.
      </p>
    );
  }

  if (total < 3) {
    return (
      <div className="px-5 py-5">
        <p className="text-ui text-muted-foreground">
          Only {total} dated positive culture{total === 1 ? "" : "s"}, too few for a
          curve:
        </p>
        <ul className="mt-2 space-y-1">
          {positiveDays.map((p) => (
            <li key={p.date} className="font-mono text-meta text-foreground">
              {fmt(p.date)} · {p.count}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.count));

  return (
    <figure className="px-5 pb-5 pt-4">
      <div aria-hidden className="flex items-end gap-6 overflow-x-auto">
        <div className="flex items-end gap-1.5">
          {points.map((p) => (
            <div key={p.date} className="flex w-10 flex-col items-center sm:w-12">
              <span
                className={cn(
                  "mb-1.5 font-mono text-meta",
                  p.count ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {p.count}
              </span>
              <span
                className={cn(
                  "w-full rounded-t-[2px]",
                  p.count ? "bg-risk-high-foreground" : "bg-border"
                )}
                style={{ height: p.count ? (p.count / max) * BAR_MAX : 2 }}
              />
              <span className="mt-2 w-full border-t border-foreground/60 pt-1.5 text-center font-mono text-[0.6875rem] leading-tight text-muted-foreground">
                {p.label}
              </span>
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                Σ{p.cumulative}
              </span>
            </div>
          ))}
        </div>
        <div className="mb-10 hidden shrink-0 border-l border-border pl-5 sm:block">
          <p className="font-display text-[2.25rem] leading-none text-foreground">{total}</p>
          <p className="mt-1.5 max-w-[11rem] text-meta text-muted-foreground">
            positives on {positiveDays.length} of {points.length} days,{" "}
            {fmt(points[0].date)}–{fmt(points.at(-1)!.date)}
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-meta text-muted-foreground sm:hidden">
        {total} positives on {positiveDays.length} of {points.length} days,{" "}
        {fmt(points[0].date)}–{fmt(points.at(-1)!.date)}
      </figcaption>

      <table className="sr-only">
        <caption>Positive cultures per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">New positives</th>
            <th scope="col">Running total</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{p.label}</td>
              <td>{p.count}</td>
              <td>{p.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
