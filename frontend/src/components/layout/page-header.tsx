import { cn } from "@/lib/utils";

/**
 * The opening block on every authenticated page: where you are, what this
 * screen is, and what it is derived from. Every page had a different heading
 * treatment before this — or, on the dashboard, none at all.
 *
 * The eyebrow is mono because it is a location, not prose; the title is set in
 * the display face so organism names can carry their conventional italic.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-px w-5 bg-border" />
          {eyebrow}
        </p>
        <h1 className="mt-2.5 font-display text-[1.875rem] font-normal leading-[1.15] tracking-[-0.015em] text-foreground sm:text-[2.125rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
