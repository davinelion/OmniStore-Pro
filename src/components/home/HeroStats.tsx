"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

import { usePrefersReducedMotion } from "@/lib/motion";

export interface HeroStat {
  value: number;
  label: string;
  /** Optional compact suffix rendered after the number, e.g. "+" */
  suffix?: string;
}

/**
 * HeroStats — animated count-up statistics for the hero band.
 *
 * The server renders the final value (SEO + no layout shift); the client then
 * counts up from zero once the element scrolls into view. Reduced-motion users
 * keep the static number.
 */
export function HeroStats({ stats, delay = 0.2 }: { stats: HeroStat[]; delay?: number }) {
  return (
    <dl className="mx-auto mt-12 grid w-full max-w-3xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={
            "relative flex flex-col items-center gap-1.5 px-2 text-center " +
            (index > 0 ? "sm:border-l sm:border-line/80" : "")
          }
        >
          <dt className="order-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            {stat.label}
          </dt>
          <dd className="order-1 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            <CountUp value={stat.value} startDelay={delay + index * 0.08} />
            {stat.suffix ? (
              <span className="text-gradient-brand" aria-hidden>
                {stat.suffix}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CountUp({ value, startDelay = 0 }: { value: number; startDelay?: number }) {
  // Server + first client paint show the final value (no hydration mismatch,
  // no layout shift); the count-up runs after hydration, on view.
  const [display, setDisplay] = useState(value);
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      delay: startDelay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce, inView, startDelay]);

  return <span ref={ref} className="tabular">{display.toLocaleString()}</span>;
}
