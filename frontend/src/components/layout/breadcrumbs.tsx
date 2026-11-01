import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Breadcrumb trail; the last crumb is the current page. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-ui text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded-sm underline-offset-2 hover:text-foreground hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-mono text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
