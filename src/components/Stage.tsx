"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Mood } from "./Eyes";
import { Backdrop } from "./Backdrop";
import { sound } from "@/lib/sound";
import { ease } from "@/lib/motion";

export type Phase = "intro" | "lot" | "scan" | "ledger" | "ritual" | "receipt";

const CAMERA: Record<Phase, { scale: number; filter: string }> = {
  intro: { scale: 1.12, filter: "brightness(0) blur(6px)" },
  lot: { scale: 1, filter: "brightness(1) blur(0px)" },
  scan: { scale: 1.06, filter: "brightness(1.08) blur(0px)" },
  ledger: { scale: 1.02, filter: "brightness(0.92) blur(0px)" },
  ritual: { scale: 1.12, filter: "brightness(1) blur(0px)" },
  receipt: { scale: 1.05, filter: "brightness(0.55) blur(3px)" },
};

/** How fast the fog runs over the lot in each act. */
const SPEED: Record<Phase, number> = { intro: 0.5, lot: 1, scan: 3, ledger: 0.8, ritual: 2.2, receipt: 0.5 };

export interface RisingTag {
  id: string;
  label: string;
  status: string;
}

/**
 * The scene behind everything: the ink-drawn lot at night, fog over the graves, one green lantern on the wheel.
 * It follows the story — the fog runs while the wallet is read, the lantern flares at a burial
 * and warms toward amber when the Barker reads something grim — and never competes with the panels.
 */
export function Stage({ phase, mood, tags = [], flare = 0 }: { phase: Phase; mood: Mood; tags?: RisingTag[]; flare?: number }) {
  const [glow, setGlow] = useState(0);
  const lit = useRef(false);

  // First light when the lot opens.
  useEffect(() => {
    if (phase === "intro" || lit.current) return;
    lit.current = true;
    sound.flicker();
    const id = setTimeout(() => sound.flicker(), 330);
    return () => clearTimeout(id);
  }, [phase]);

  // A burial flares the lantern for a moment.
  useEffect(() => {
    if (!flare) return;
    const a = setTimeout(() => setGlow(1.4), 0);
    const b = setTimeout(() => setGlow(0), 1300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [flare]);

  const tint: [number, number, number] = mood === "grave" ? [1.0, 0.62, 0.3] : [0.3, 0.88, 0.63];
  const cam = CAMERA[phase];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-ink-0">
      <motion.div
        className="absolute inset-0"
        initial={CAMERA.intro}
        animate={phase === "ritual" ? { ...cam, x: [0, -3, 4, -2, 1, 0] } : { ...cam, x: 0 }}
        transition={{ duration: phase === "lot" ? 2.4 : 1.6, ease: ease.inOut, x: { duration: 0.6, delay: 0.8 } }}
      >
        <Backdrop speed={SPEED[phase]} glow={glow + (phase === "scan" ? 0.25 : 0)} tint={tint} />

        {/* Names rising out of the light as the scan finds them. */}
        <AnimatePresence>
          {tags.map((t, i) => (
            <GraveTag key={t.id} tag={t} i={i} />
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="absolute inset-0" style={{ background: "radial-gradient(110% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%)" }} />
      <div className="absolute inset-x-0 top-0 h-28" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,.8), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(to top, rgba(5,5,5,.85), transparent)" }} />
    </div>
  );
}

function GraveTag({ tag, i }: { tag: RisingTag; i: number }) {
  // Tags float up out of the fog, in the open middle of the frame.
  const slots = [38, 61, 44, 66, 49, 35, 57, 41, 63, 47, 69, 53];
  const left = slots[i % slots.length] + ((i * 7) % 5) - 2;
  const top = 62 + ((i * 13) % 16);
  const dead = tag.status === "RUGGED" || tag.status === "DUST" || tag.status === "EMPTY";
  return (
    <motion.div
      className="absolute"
      style={{ left: `${left}%`, top: `${top}%` }}
      initial={{ opacity: 0, y: 16, rotate: -5 + (i % 4) * 3, scale: 0.92 }}
      animate={{ opacity: [0, 1, 1, 0], y: [16, -8, -40, -96], scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3.4, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
    >
      <div className="ticket origin-center px-3 py-1.5 text-center shadow-[0_10px_30px_rgba(0,0,0,.8)] max-lg:scale-75">
        <div className="font-display text-[16px] leading-none">${tag.label}</div>
        <div className={`mt-1 font-type text-[9px] tracking-[0.2em] ${dead ? "text-blood-2" : "text-lamp-deep"}`}>{tag.status === "ALIVE" ? "BREATHING" : tag.status}</div>
      </div>
    </motion.div>
  );
}
