"use client";
import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, AnimatePresence } from "motion/react";

/** One listener for the whole page: whichever panel the pointer is over gets lit from that point. */
export function PanelGlow() {
  useEffect(() => {
    let last: HTMLElement | null = null;
    const on = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".panel") as HTMLElement | null;
      if (last && last !== el) last.style.setProperty("--glow", "0");
      if (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--gx", `${e.clientX - r.left}px`);
        el.style.setProperty("--gy", `${e.clientY - r.top}px`);
        el.style.setProperty("--glow", "1");
      }
      last = el;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);
  return null;
}

/** A number that counts to its new value instead of jumping. */
export function Ticker({ value, format, duration = 0.9 }: { value: number; format: (n: number) => string; duration?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv, duration, reduce]);
  return <motion.span>{text}</motion.span>;
}

/** A clock whose digits roll like a ticket counter. Only the digits that change move. */
export function RollingClock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex overflow-hidden ${className}`} aria-label={text}>
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="relative inline-block w-[0.62em] text-center" aria-hidden>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                className="inline-block"
                initial={{ y: "-70%", opacity: 0, filter: "blur(2px)" }}
                animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                exit={{ y: "70%", opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={i} aria-hidden className="inline-block w-[0.4em] text-center opacity-60">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
