"use client";

import { useEffect, useRef } from "react";
import { useScrollProgress } from "@/components/landing/use-scroll-progress";
import { cn } from "@/lib/utils";

/**
 * Client shell for the product showcase: parallax on scroll and the `inert`
 * attribute on each frame's contents (React 18 has no `inert` prop). The
 * contents are server-rendered real components; this only moves and freezes
 * them.
 */
export function ProductFrames({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, "through");

  useEffect(() => {
    ref.current
      ?.querySelectorAll("[data-frame-body]")
      .forEach((el) => el.setAttribute("inert", ""));
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12 lg:items-start">
      {children}
    </div>
  );
}

/** A column of frames; columns are independent so one tall frame leaves no hole. */
export function FrameColumn({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-10 lg:gap-14", className)}>
      {children}
    </div>
  );
}

export function Frame({
  route,
  title,
  caption,
  amplitude,
  className,
  bodyClassName,
  children,
}: {
  route: string;
  title: string;
  caption: string;
  /** Parallax travel in px across the section; negative moves against scroll. */
  amplitude: number;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      className={cn("group", className)}
      style={{ transform: `translateY(calc((var(--p) - 0.5) * ${amplitude}px))` }}
    >
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-pop transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
        <div className="flex h-8 items-center gap-2 border-b border-border bg-card px-3">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-node-location" />
          <span className="truncate font-mono text-[0.6875rem] text-muted-foreground">{route}</span>
        </div>
        <div
          data-frame-body
          aria-hidden
          className={cn("overflow-hidden p-4", bodyClassName)}
        >
          {children}
        </div>
      </div>
      <figcaption className="mt-3 px-1">
        <span className="block text-ui font-semibold text-foreground">{title}</span>
        <span className="block text-ui text-muted-foreground">{caption}</span>
      </figcaption>
    </figure>
  );
}
