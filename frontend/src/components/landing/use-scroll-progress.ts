"use client";

import { useEffect, useState } from "react";

/**
 * Writes the element's scroll progress (0 → 1) to the CSS custom property
 * `--p` on that element, once per animation frame while scrolling. Effects
 * read it in plain CSS (`calc(var(--p) * …)`), so scrolling never re-renders
 * React.
 *
 *  reveal  — 0 when the top reaches 90% of the viewport height, 1 when the
 *            bottom does, so the effect is finished once it is fully on
 *            screen. For draw-on effects.
 *  through — 0 when the top enters, 1 when the bottom leaves. For parallax.
 *
 * With reduced motion it pins `--p` to 1 (the finished state) and never
 * listens. Before hydration `--p` is unset, so anything that uses it falls back
 * to its finished, static state.
 */
export function useScrollProgress(
  ref: React.RefObject<HTMLElement>,
  mode: "reveal" | "through" = "reveal"
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "1");
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p =
        mode === "reveal"
          ? // finished when the element's bottom reaches 90% of the viewport
            (vh * 0.9 - r.top) / Math.max(r.height, vh * 0.35)
          : (vh - r.top) / (vh + r.height);
      el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
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
  }, [ref, mode]);
}

/** True when the user asked for reduced motion (client only; false on the server). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * CSS for something that reveals between progress `from` and `from + span`:
 * opacity 0 → 1 and a short rise. With `--p` unset (no JS yet) the
 * declarations are invalid and the element simply shows, finished.
 */
export function revealStyle(from: number, span = 0.16): React.CSSProperties {
  const t = `clamp(0, calc((var(--p) - ${from}) / ${span}), 1)`;
  return {
    opacity: t,
    transform: `translateY(calc((1 - ${t}) * 14px))`,
  };
}

/** 0 → 1 between `from` and `from + span`, as a CSS expression. */
export function progressExpr(from: number, span = 0.12) {
  return `clamp(0, calc((var(--p) - ${from}) / ${span}), 1)`;
}
