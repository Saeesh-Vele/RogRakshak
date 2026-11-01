"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A large figure that counts up from zero the first time it scrolls into view.
 * The server render and the reduced-motion render show the final value, so the
 * number is never wrong, only late. Screen readers get the final value once,
 * via the visually hidden copy; the animating digits are aria-hidden.
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 1400,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShown(value * (1 - Math.pow(1 - t, 3)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const text = (n: number) => n.toFixed(decimals) + suffix;

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{text(shown)}</span>
      <span className="sr-only">{text(value)}</span>
    </span>
  );
}
