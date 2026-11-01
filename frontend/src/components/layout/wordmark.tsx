import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Product mark, shared by the sidebar, the auth screens and the landing page.
 *
 * The glyph is the product's own subject in miniature: an index patient (red),
 * the staff member who carried it (teal) and a downstream case (amber), joined
 * by the hops between them — the same three node colours the transmission
 * graph uses. The name is set in the display serif.
 */
export function ChainMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 12"
      aria-hidden
      className={cn("h-3 w-7 shrink-0", className)}
    >
      <path
        d="M3 6h22"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
      />
      <circle cx="3" cy="6" r="2.75" fill="hsl(var(--node-infected))" />
      <circle cx="14" cy="6" r="2.75" fill="hsl(var(--node-location))" />
      <circle cx="25" cy="6" r="2.75" fill="hsl(var(--node-downstream))" />
    </svg>
  );
}

export function Wordmark({
  href = "/dashboard",
  size = "default",
  tone = "default",
  className,
}: {
  href?: string;
  size?: "default" | "lg";
  /** "light" inverts the wordmark for dark surfaces. */
  tone?: "default" | "light";
  className?: string;
}) {
  const lg = size === "lg";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-sm",
        tone === "light" ? "text-white" : "text-foreground",
        className
      )}
    >
      <ChainMark className={lg ? "h-3.5 w-8" : undefined} />
      <span
        className={cn(
          "font-display font-medium tracking-[-0.01em]",
          lg ? "text-[1.375rem]" : "text-[1.1875rem]"
        )}
      >
        RogRakshak
      </span>
    </Link>
  );
}
