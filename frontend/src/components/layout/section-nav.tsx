"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation for long pages. Sits just under the top bar,
 * marks the section currently in view with aria-current="location", and
 * scrolls horizontally on narrow screens (its links keep it keyboard
 * reachable).
 */
export function SectionNav({
  sections,
  className,
}: {
  sections: { id: string; label: string }[];
  className?: string;
}) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      // A section is "current" once it reaches the band under the sticky bars
      { rootMargin: "-120px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="On this page"
      className={cn("sticky top-14 z-10 -mx-5 border-b border-border bg-background/95 px-5 md:-mx-8 md:px-8", className)}
    >
      <ul className="no-scrollbar flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center px-2.5 text-ui transition-colors",
                active === s.id
                  ? "font-medium text-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
