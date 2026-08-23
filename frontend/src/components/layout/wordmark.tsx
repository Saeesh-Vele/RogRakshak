import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Product mark. Shared by the sidebar, the auth screens and the landing page so
 * the identity is defined in exactly one place.
 */
export function Wordmark({
  href = "/dashboard",
  size = "default",
  tone = "default",
  className,
}: {
  href?: string;
  size?: "default" | "lg";
  /** "light" inverts the wordmark for the landing page's ink sections. */
  tone?: "default" | "light";
  className?: string;
}) {
  const lg = size === "lg";

  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "relative grid shrink-0 place-items-center rounded-lg bg-primary",
          lg ? "h-10 w-10" : "h-8 w-8"
        )}
      >
        <span
          className={cn(
            "absolute rounded-full bg-white/95",
            lg ? "left-2 top-2 h-2.5 w-2.5" : "left-1.5 top-1.5 h-2 w-2"
          )}
        />
        <span
          className={cn(
            "absolute rounded-full bg-[#F97362]",
            lg ? "bottom-2 right-2 h-3 w-3" : "bottom-1.5 right-1.5 h-2.5 w-2.5"
          )}
        />
      </span>
      <span
        className={cn(
          "font-bold tracking-tight",
          tone === "light" ? "text-white" : "text-foreground",
          lg ? "text-xl" : "text-lg"
        )}
      >
        RogRakshak
      </span>
    </Link>
  );
}
