import { cn } from "@/lib/utils";

/**
 * The opening block on every signed-in page: where you are (eyebrow), what
 * this is (serif title — organism names keep their italic) and what it is
 * derived from (description). Closed by a hairline rule rather than a box.
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
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-5",
        className
      )}
    >
      <div className="min-w-0">
        <p className="label-caps">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-title font-normal text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-copy text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
