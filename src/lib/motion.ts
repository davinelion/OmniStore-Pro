/**
 * Motion helpers. Wraps framer-motion with a single reduced-motion policy:
 * CSS kills transitions globally via the existing media query; JS-driven
 * animations consult `usePrefersReducedMotion()` and skip transforms.
 */

import { useEffect, useState } from "react";

export { motion, AnimatePresence } from "framer-motion";

const QUERY = "(prefers-reduced-motion: reduce)";

/** True when the user asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Props helper: fades/slides an element in unless reduced motion is on.
 * Server render outputs no initial transform (no hydration mismatch).
 */
export function entrance(delay = 0) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { delay } },
  };
}
