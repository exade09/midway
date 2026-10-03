"use client";
import { motion } from "motion/react";

/**
 * The lot at night, drawn in a few hundred bytes of SVG: a horizon, a far-off Ferris wheel turning slowly,
 * three tents, a string of bulbs and a field of small crosses. Everything sits just above black —
 * it's felt more than seen, so the panels stay the subject.
 */
const CROSSES = Array.from({ length: 34 }, (_, i) => {
  // Deterministic scatter: two depth rows, bigger and lower toward the viewer.
  const row = i % 3 === 0 ? 1 : 0;
  const x = ((i * 137.5) % 1600) + (row ? 20 : 0);
  const y = row ? 742 + ((i * 17) % 22) : 712 + ((i * 11) % 14);
  const s = row ? 1.25 + ((i * 7) % 5) * 0.06 : 0.75 + ((i * 5) % 4) * 0.06;
  return { x, y, s, tilt: ((i * 29) % 11) - 5 };
});

const SPOKES = 16;

export function Skyline() {
  return (
    <svg aria-hidden viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060707" />
          <stop offset="62%" stopColor="#0b0d0c" />
          <stop offset="78%" stopColor="#101311" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <radialGradient id="haze" cx="50%" cy="78%" r="55%">
          <stop offset="0%" stopColor="#c9a65a" stopOpacity="0.07" />
          <stop offset="60%" stopColor="#c9a65a" stopOpacity="0.015" />
          <stop offset="100%" stopColor="#c9a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0b0a" />
          <stop offset="100%" stopColor="#040404" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#sky)" />
      <rect width="1600" height="900" fill="url(#haze)" />

      <g fill="#111312" stroke="#1b1e1c" strokeWidth="1">
        {/* Ferris wheel, far left, turning about once every two minutes */}
        <g transform="translate(790 572) scale(0.86)">
          <path d="M-70 156 L0 0 L70 156 M-46 156 L0 30 L46 156" fill="none" stroke="#171a18" strokeWidth="3" />
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 140, ease: "linear", repeat: Infinity }}>
            <circle r="128" fill="none" stroke="#1a1d1b" strokeWidth="2.5" />
            <circle r="118" fill="none" stroke="#151816" strokeWidth="1" />
            {Array.from({ length: SPOKES }, (_, k) => {
              const a = (k / SPOKES) * Math.PI * 2;
              return <line key={k} x1="0" y1="0" x2={Math.cos(a) * 128} y2={Math.sin(a) * 128} stroke="#151816" strokeWidth="1" />;
            })}
            {Array.from({ length: SPOKES }, (_, k) => {
              const a = (k / SPOKES) * Math.PI * 2;
              return (
                <circle
                  key={"b" + k}
                  cx={Math.cos(a) * 128}
                  cy={Math.sin(a) * 128}
                  r="2.2"
                  fill="#c9a65a"
                  stroke="none"
                  style={{ animation: `bulbtw ${2.4 + (k % 5) * 0.37}s ease-in-out ${k * 0.21}s infinite` }}
                />
              );
            })}
          </motion.g>
          <circle r="7" fill="#171a18" />
        </g>

        {/* Tents */}
        <path d="M560 704 Q610 640 640 606 Q670 640 720 704 Z" />
        <path d="M640 606 L640 586" fill="none" />
        <path d="M600 704 L640 606 L680 704" fill="none" stroke="#151816" />
        <path d="M1090 704 Q1160 620 1200 576 Q1240 620 1310 704 Z" />
        <path d="M1200 576 L1200 552" fill="none" />
        <path d="M1145 704 L1200 576 L1255 704 M1172 704 L1200 576 L1228 704" fill="none" stroke="#151816" />
        <path d="M1330 704 Q1370 660 1392 636 Q1414 660 1454 704 Z" />
        <path d="M250 704 Q300 650 330 618 Q360 650 410 704 Z" />
        <path d="M290 704 L330 618 L370 704" fill="none" stroke="#151816" />

        {/* Poles and a sagging string of bulbs between them */}
        <path d="M470 704 V560 M860 704 V590 M1010 704 V570 M1500 704 V585" fill="none" stroke="#161917" strokeWidth="2" />
        <path d="M470 562 Q665 640 860 592 Q935 616 1010 572" fill="none" stroke="#141715" />
        <path d="M1310 610 Q1405 640 1500 588" fill="none" stroke="#141715" />
      </g>

      {/* String-light bulbs, each breathing on its own clock */}
      {[
        ...Array.from({ length: 14 }, (_, k) => {
          const t = (k + 0.5) / 14;
          const x = (1 - t) * (1 - t) * 470 + 2 * (1 - t) * t * 665 + t * t * 860;
          const y = (1 - t) * (1 - t) * 562 + 2 * (1 - t) * t * 640 + t * t * 592;
          return [x, y] as const;
        }),
        ...Array.from({ length: 5 }, (_, k) => {
          const t = (k + 0.5) / 5;
          return [(1 - t) * (1 - t) * 860 + 2 * (1 - t) * t * 935 + t * t * 1010, (1 - t) * (1 - t) * 592 + 2 * (1 - t) * t * 616 + t * t * 572] as const;
        }),
      ].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y + 3} r="2" fill="#c9a65a" style={{ animation: `bulbtw ${2 + (k % 4) * 0.5}s ease-in-out ${k * 0.17}s infinite` }} />
      ))}

      {/* Ground */}
      <path d="M0 708 C 260 696, 520 716, 800 704 S 1340 698, 1600 710 L1600 900 L0 900 Z" fill="url(#ground)" />

      {/* The field of crosses */}
      <g fill="#0d0f0e" stroke="#171a18" strokeWidth="0.8">
        {CROSSES.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.tilt}) scale(${c.s})`}>
            <path d="M-2 -26 h4 v8 h8 v4 h-8 v18 h-4 v-18 h-8 v-4 h8 z" />
          </g>
        ))}
      </g>

      <style>{`@keyframes bulbtw{0%,100%{opacity:.25}50%{opacity:.9}}`}</style>
    </svg>
  );
}

/** The lamp: a bare bulb in a wire cage on a long cord, swaying a little in the wind. */
export function HangingLamp({ glow, x }: { glow: React.ReactNode; x: number }) {
  return (
    <motion.div
      className="absolute top-0 h-[30vh] w-[120px] -translate-x-1/2"
      style={{ left: `${x * 100}%`, transformOrigin: "50% 0%" }}
      animate={{ rotate: [-1.2, 1.4, -0.8, 1.1, -1.2] }}
      transition={{ duration: 11, ease: "easeInOut", repeat: Infinity }}
    >
      <div className="absolute left-1/2 top-0 h-[calc(100%-44px)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#2a2d2b] to-[#3a3e3b]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        {glow}
        <svg width="34" height="50" viewBox="0 0 34 50" className="relative">
          <rect x="12" y="0" width="10" height="7" rx="1" fill="#1d201e" stroke="#2c302d" />
          <path d="M8 9 Q17 5 26 9 L27 40 Q17 47 7 40 Z" fill="none" stroke="#2c302d" strokeWidth="1.2" />
          <path d="M17 7 V44 M7.5 24 H26.5 M11 9 L9 40 M23 9 L25 40" stroke="#262a27" strokeWidth="1" />
          <ellipse cx="17" cy="26" rx="7" ry="10" fill="#b8ffdc" />
          <ellipse cx="17" cy="25" rx="3.2" ry="5" fill="#ffffff" />
        </svg>
      </div>
    </motion.div>
  );
}
