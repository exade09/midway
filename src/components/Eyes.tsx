"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useSpring, type MotionValue } from "motion/react";

export type Mood = "idle" | "scan" | "glee" | "grave" | "flare" | "sleep";

export interface EyeSpot {
  /** Centre and size as % of the parent box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Painted over the drawn eyes so the Barker can look at you.
 * Pupils follow the pointer, dart during a scan, dilate when he smells a corpse, and the irises catch the lamp.
 */
export function Eyes({ spots, mood, px, py }: { spots: EyeSpot[]; mood: Mood; px: MotionValue<number>; py: MotionValue<number> }) {
  const [blink, setBlink] = useState(false);
  const dartX = useSpring(0, { stiffness: 900, damping: 40 });
  const dartY = useSpring(0, { stiffness: 900, damping: 40 });
  const moodRef = useRef(mood);
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        if (moodRef.current !== "sleep") {
          setBlink(true);
          setTimeout(() => setBlink(false), 130);
        }
        loop();
      }, 2400 + Math.random() * 4200);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mood !== "scan") {
      dartX.set(0);
      dartY.set(0);
      return;
    }
    const id = setInterval(() => {
      dartX.set((Math.random() * 2 - 1) * 14);
      dartY.set((Math.random() * 2 - 1) * 8);
    }, 260);
    return () => clearInterval(id);
  }, [mood, dartX, dartY]);

  const pupilR = mood === "glee" ? 22 : mood === "flare" ? 12 : mood === "grave" ? 15 : 17;
  const lid = mood === "sleep" ? 1 : blink ? 1 : mood === "grave" ? 0.42 : 0;
  const iris = mood === "flare" ? 1 : mood === "glee" ? 0.75 : mood === "scan" ? 0.55 : 0.12;

  return (
    <>
      {spots.map((s, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: `${s.x - s.w / 2}%`, top: `${s.y - s.h / 2}%`, width: `${s.w}%`, height: `${s.h}%` }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <radialGradient id={`ig${i}`}>
                <stop offset="0%" stopColor="#c9ffe6" />
                <stop offset="55%" stopColor="#5ae8a8" />
                <stop offset="100%" stopColor="#5ae8a8" stopOpacity="0" />
              </radialGradient>
              <clipPath id={`ec${i}`}>
                <ellipse cx="50" cy="50" rx="46" ry="46" />
              </clipPath>
            </defs>
            {/* Glow spill around the eye when the lamp's in them */}
            <motion.ellipse cx="50" cy="50" rx="95" ry="95" fill={`url(#ig${i})`} animate={{ opacity: iris * 0.55 }} transition={{ duration: 0.4 }} />
            <ellipse cx="50" cy="50" rx="46" ry="46" fill="#f3f1ea" />
            <g clipPath={`url(#ec${i})`}>
              <motion.g style={{ x: px, y: py }}>
                <motion.g style={{ x: dartX, y: dartY }}>
                  <motion.circle cx="50" cy="50" fill="none" stroke="#5ae8a8" strokeWidth="7" animate={{ r: pupilR + 8, opacity: iris }} transition={{ duration: 0.3 }} />
                  <motion.circle cx="50" cy="50" fill="#060606" animate={{ r: pupilR }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
                  <circle cx="44" cy="44" r="4" fill="#fff" opacity="0.9" />
                </motion.g>
              </motion.g>
              {/* Lids */}
              <motion.rect x="-5" y="-5" width="110" height="60" fill="#070707" style={{ originY: 0 }} animate={{ scaleY: lid }} transition={{ duration: blink ? 0.06 : 0.25 }} />
              <motion.rect x="-5" y="50" width="110" height="55" fill="#070707" style={{ originY: 1 }} animate={{ scaleY: lid * 0.9 }} transition={{ duration: blink ? 0.06 : 0.25 }} />
            </g>
            <ellipse cx="50" cy="50" rx="47" ry="47" fill="none" stroke="#0a0a0a" strokeWidth="5" opacity="0.85" />
          </svg>
        </div>
      ))}
    </>
  );
}
