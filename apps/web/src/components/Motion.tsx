import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';

// Shared timings, mirrored from motion.css (docs/frontend-design-prompt.md).
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const DUR = { micro: 0.12, short: 0.22, long: 0.42 } as const;

// Fades each route in. Keyed on the pathname only, so ?filters on Matches do not replay it.
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.short, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}

// Counts from 0 to `value` once, when it scrolls into view. Prints the final value without JS or under reduced motion.
export function CountUp({ value, suffix = '', delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || reduce) return;
    setShown(0);
    const controls = animate(0, value, { duration: 0.9, delay, ease: EASE_OUT, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, value, delay]);
  return <span ref={ref}>{shown}{suffix}</span>;
}
