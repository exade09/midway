"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ease } from "@/lib/motion";
import { sound } from "@/lib/sound";

const WORD = "MIDWAY".split("");

/** Cold open: a dark field, the marquee letters catch one by one, then the gate. */
export function Intro({ onEnter }: { onEnter: () => void }) {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const ids = WORD.map((_, i) => setTimeout(() => setLit(i + 1), 500 + i * 230 + (i === 3 ? 260 : 0)));
    return () => ids.forEach(clearTimeout);
  }, []);
  const ready = lit === WORD.length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-0/90"
      exit={{ opacity: 0, transition: { duration: 1.2, ease: ease.inOut } }}
    >
      <div className="relative px-6 text-center">
        <motion.div
          className="bulbs mx-auto mb-8 h-1 w-56"
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: ready ? 1 : 0.15, scaleX: 1 }}
          transition={{ duration: 1.4, ease: ease.out }}
        />
        <h1 className="flex justify-center gap-[0.04em] font-display text-[clamp(64px,13vw,184px)] leading-none tracking-[0.02em]">
          {WORD.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.04, filter: "blur(6px)" }}
              animate={
                i < lit
                  ? { opacity: [0.04, 1, 0.3, 1], filter: "blur(0px)", color: ["#2a2b29", "#f3f1ea", "#8a8c86", "#ece7da"], textShadow: ["0 0 0 transparent", "0 0 30px rgba(90,232,168,.6)", "0 0 0 transparent", "0 0 18px rgba(90,232,168,.35)"] }
                  : {}
              }
              transition={{ duration: 0.55, times: [0, 0.25, 0.45, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-5 font-serif text-[clamp(18px,2.2vw,26px)] italic text-ash-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 8 }}
          transition={{ duration: 1.1, ease: ease.out, delay: 0.2 }}
        >
          a carnival for dead bags
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 14 }}
          transition={{ duration: 1, ease: ease.out, delay: 0.7 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <button
            className="btn btn-lamp px-10 py-4 text-sm"
            onClick={() => {
              sound.start();
              sound.sting();
              onEnter();
            }}
          >
            Enter the lot
          </button>
          <span className="label text-[10px] text-ash">sound on · solana mainnet</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
