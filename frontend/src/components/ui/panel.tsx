import { cn } from "@/lib/utils";

/**
 * A titled content panel. Deliberately lighter than the old card header: a
 * mono uppercase label rather than a bold heading, so panel titles sit below
 * the page title in the hierarchy instead of competing with it, and a count
 * chip on the right where the panel holds a countable list.
 */
export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Short right-aligned count, e.g. "3 cases". Rendered as a mono chip. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3.5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="label-caps text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-ui text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(meta || actions) && (
        <div className="flex shrink-0 items-center gap-2">
          {meta && (
            <span className="font-mono text-meta text-muted-foreground">
              {meta}
            </span>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
