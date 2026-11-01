"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The landing page's navigation: a floating bar inset from the top edge that
 * condenses once you scroll, marks the section in view (aria-current), and
 * shows reading progress as a thin line along its bottom edge.
 *
 * Anchors land below the bar: while this page is mounted, <html> gets
 * scroll-padding-top (and smooth scrolling, unless reduced motion is on).
 * Both are restored on unmount, so app pages keep their own behaviour.
 *
 * Below md the links move into a native <dialog>: it traps focus, closes on
 * Escape, and returns focus to the menu button — or to the chosen section.
 */

const SECTIONS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "case", label: "The case" },
  { id: "product", label: "Product" },
];

const BAR_CLEARANCE_PX = 92;

export function LandingNav() {
  const barRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pendingTarget = useRef<string | null>(null);
  const dialogId = useId();
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Landing-only scroll behaviour on <html>
  useEffect(() => {
    const html = document.documentElement;
    const prev = { behavior: html.style.scrollBehavior, padding: html.style.scrollPaddingTop };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) html.style.scrollBehavior = "smooth";
    html.style.scrollPaddingTop = `${BAR_CLEARANCE_PX}px`;
    return () => {
      html.style.scrollBehavior = prev.behavior;
      html.style.scrollPaddingTop = prev.padding;
    };
  }, []);

  // Condensed state, scrollspy and progress, once per frame while scrolling
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      setCondensed(y > 24);
      const max = document.documentElement.scrollHeight - vh;
      barRef.current?.style.setProperty("--nav-progress", String(max > 0 ? Math.min(1, y / max) : 0));
      // The section crossing 40% of the viewport is the current one
      const line = vh * 0.4;
      let current: string | null = null;
      for (const s of SECTIONS) {
        const r = document.getElementById(s.id)?.getBoundingClientRect();
        if (r && r.top <= line && r.bottom > line) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const openMenu = useCallback(() => {
    dialogRef.current?.showModal();
    setMenuOpen(true);
  }, []);
  const closeMenu = useCallback(() => dialogRef.current?.close(), []);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    pendingTarget.current = id;
    closeMenu();
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-6">
        <div
          ref={barRef}
          className={cn(
            "relative mx-auto flex max-w-[1200px] items-center justify-between gap-4 overflow-hidden rounded-lg border border-border backdrop-blur-md transition-[height,padding,background-color] duration-200 ease-out",
            condensed ? "h-12 bg-background/90 px-3" : "h-16 bg-background/75 px-5"
          )}
        >
          <Wordmark href="/" />

          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {SECTIONS.map((s) => {
                const on = active === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={on ? "location" : undefined}
                      className={cn(
                        "relative inline-flex h-9 items-center rounded-sm px-3 text-ui transition-colors",
                        on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-3 bottom-1 h-0.5 origin-left bg-primary transition-transform duration-200",
                          on ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ size: condensed ? "sm" : "default" })}>
              Sign in
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={openMenu}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls={dialogId}
              aria-label="Open section menu"
              className="grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-sunken md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Reading progress */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-primary/70"
            style={{ transform: "scaleX(var(--nav-progress, 0))" }}
          />
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Sections"
        onClose={() => {
          setMenuOpen(false);
          const id = pendingTarget.current;
          pendingTarget.current = null;
          const target = id ? document.getElementById(id) : null;
          if (target) {
            history.replaceState(null, "", `#${id}`);
            target.scrollIntoView({ block: "start" });
            // Move focus to the section so keyboard users continue from there
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          } else {
            menuButtonRef.current?.focus();
          }
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeMenu();
        }}
        onKeyDown={(e) => {
          // The modal dialog already makes the page inert; this also keeps Tab
          // from leaving for the browser's address bar, so focus wraps inside.
          if (e.key !== "Tab") return;
          const items = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []
          );
          if (items.length === 0) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className="m-0 mt-3 w-[calc(100%-1.5rem)] max-w-none translate-x-3 rounded-lg border border-border bg-card p-0 text-foreground shadow-pop backdrop:bg-foreground/20 md:hidden"
      >
        <div className="flex items-center justify-between border-b border-border py-1 pl-4 pr-1">
          <span className="label-caps text-foreground">On this page</span>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close section menu"
            className="grid h-11 w-11 place-items-center rounded-md hover:bg-sunken"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Section menu">
          <ul className="py-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={goTo(s.id)}
                  aria-current={active === s.id ? "location" : undefined}
                  className={cn(
                    "flex min-h-12 items-center justify-between px-4 text-copy",
                    active === s.id ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                  {active === s.id && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Sign in
          </Link>
        </div>
      </dialog>
    </>
  );
}
