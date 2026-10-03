"use client";
import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, AnimatePresence, type MotionValue } from "motion/react";
import { Eyes, type Mood } from "./Eyes";
import { Fog } from "./Fog";
import { Particles } from "./Particles";
import { sound } from "@/lib/sound";
import { ease } from "@/lib/motion";

export type Phase = "intro" | "lot" | "scan" | "ledger" | "ritual" | "receipt";

/** Measured off the banner (1657×914): the Barker's eyes and the lamp. */
const ASPECT = 1657 / 914;
const EYES = [
  { x: 52.034, y: 50.33, w: 1.36, h: 2.5 },
  { x: 54.869, y: 48.14, w: 1.2, h: 2.32 },
];
const LAMP = { x: 0.7428, y: 0.186 };

const CAMERA: Record<Phase, { scale: number; x: string; y: string; filter: string }> = {
  intro: { scale: 1.22, x: "0%", y: "2%", filter: "brightness(0) blur(6px)" },
  lot: { scale: 1, x: "0%", y: "0%", filter: "brightness(1) blur(0px)" },
  scan: { scale: 1.16, x: "-1%", y: "-3%", filter: "brightness(0.9) blur(0px)" },
  ledger: { scale: 1.05, x: "1.5%", y: "0%", filter: "brightness(0.82) blur(0px)" },
  ritual: { scale: 1.3, x: "-1%", y: "-5%", filter: "brightness(0.7) blur(0px)" },
  receipt: { scale: 1.08, x: "0%", y: "0%", filter: "brightness(0.45) blur(4px)" },
};

export interface RisingTag {
  id: string;
  label: string;
  status: string;
}

export function Stage({ phase, mood, tags = [], flare = 0 }: { phase: Phase; mood: Mood; tags?: RisingTag[]; flare?: number }) {
  // Pointer → parallax and gaze.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 });
  const sy = useSpring(my, { stiffness: 50, damping: 18 });
  const backX = useTransform(sx, (v) => v * -6);
  const backY = useTransform(sy, (v) => v * -3);
  const midX = useTransform(sx, (v) => v * -12);
  const midY = useTransform(sy, (v) => v * -6);
  const frontX = useTransform(sx, (v) => v * -24);
  const frontY = useTransform(sy, (v) => v * -10);
  const lanternX = useTransform(sx, (v) => `${(v + 1) * 50}%`);
  const lanternY = useTransform(sy, (v) => `${(v + 1) * 50}%`);
  const lantern = useTransform([lanternX, lanternY], ([x, y]) => `radial-gradient(420px 320px at ${x} ${y}, rgba(220,240,230,.10), rgba(90,232,168,.035) 40%, transparent 70%)`);
  const gazeX = useTransform(sx, (v) => v * 15);
  const gazeY = useTransform(sy, (v) => v * 11);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  // The lamp: a living light source that sputters, and flares when something is burned.
  const lamp = useMotionValue(phase === "intro" ? 0 : 1);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "intro") lamp.set(0);
    else if (lamp.get() < 0.5) {
      // First light: the filament catches.
      animate(lamp, [0, 0.8, 0.1, 0.9, 0.3, 1], { duration: 1.1, times: [0, 0.15, 0.3, 0.5, 0.6, 1] });
      sound.flicker();
      setTimeout(() => sound.flicker(), 330);
    }
  }, [phase, lamp]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const p = phaseRef.current;
      const nervous = p === "scan" || p === "ritual";
      t = setTimeout(() => {
        if (phaseRef.current !== "intro") {
          const base = nervous ? 1.25 : 1;
          animate(lamp, [base, 0.35, base * 0.9, 0.55, base], { duration: 0.32 });
          if (Math.random() < 0.7) sound.flicker();
        }
        loop();
      }, nervous ? 700 + Math.random() * 1400 : 3500 + Math.random() * 6500);
    };
    loop();
    return () => clearTimeout(t);
  }, [lamp]);

  useEffect(() => {
    if (!flare) return;
    animate(lamp, [1, 2.6, 1.6, 2.2, 1], { duration: 1.4, ease: "easeOut" });
  }, [flare, lamp]);

  const glowOpacity = useTransform(lamp, (v) => Math.min(1, v * 0.85));
  const coneOpacity = useTransform(lamp, (v) => Math.min(0.9, v * 0.4));
  const spill = useTransform(lamp, (v) => Math.min(0.5, v * 0.16));

  const cam = CAMERA[phase];
  const scanning = phase === "scan";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-ink-0">
      <div
        className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 lg:top-1/2"
        style={{ width: `max(100vw, ${100 * ASPECT}vh)`, height: `max(100vh, ${100 / ASPECT}vw)` }}
      >
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "53% 52%" }}
        initial={CAMERA.intro}
        animate={phase === "ritual" ? { ...cam, rotate: [0, -0.4, 0.5, -0.3, 0.2, 0] } : { ...cam, rotate: 0 }}
        transition={{ duration: phase === "lot" ? 2.6 : 1.6, ease: ease.inOut, rotate: { duration: 0.6, delay: 0.8 } }}
      >
        {/* Three depth bands of the same drawing, feathered so the seams sit in the fog. */}
        <Layer src="/art/banner.webp" mask="linear-gradient(to bottom, #000 0%, #000 40%, transparent 52%)" x={backX} y={backY} />
        <Layer src="/art/banner.webp" mask="linear-gradient(to bottom, transparent 38%, #000 47%, #000 74%, transparent 84%)" x={midX} y={midY}>
          <Eyes spots={EYES} mood={mood} px={gazeX} py={gazeY} />
        </Layer>
        <Layer src="/art/banner.webp" mask="linear-gradient(to bottom, transparent 72%, #000 82%)" x={frontX} y={frontY} />

        {/* Lamp glow and the cone it throws on the ground. */}
        <motion.div
          className="absolute rounded-full"
          style={{
            left: `${LAMP.x * 100}%`,
            top: `${LAMP.y * 100}%`,
            width: "22%",
            aspectRatio: "1",
            translateX: "-50%",
            translateY: "-50%",
            background: "radial-gradient(circle, rgba(170,255,215,.55) 0%, rgba(90,232,168,.22) 22%, rgba(90,232,168,.06) 45%, transparent 70%)",
            mixBlendMode: "screen",
            opacity: glowOpacity,
          }}
        />
        <motion.div
          className="absolute"
          style={{
            left: `${LAMP.x * 100}%`,
            top: `${LAMP.y * 100}%`,
            width: "60%",
            height: "95%",
            translateX: "-62%",
            background: "radial-gradient(50% 60% at 55% 0%, rgba(90,232,168,.16), rgba(90,232,168,.05) 45%, transparent 75%)",
            mixBlendMode: "screen",
            opacity: coneOpacity,
          }}
        />

        <Particles lamp={LAMP} heat={scanning ? 1 : phase === "ritual" ? 1.5 : 0} />

        {/* Searchlight sweeping the graves during a scan. */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="beam"
              className="absolute"
              style={{
                left: `${LAMP.x * 100}%`,
                top: `${LAMP.y * 100}%`,
                width: "140%",
                height: "140%",
                translateX: "-50%",
                translateY: "-50%",
                background: "conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(150,255,205,.0) 8deg, rgba(150,255,205,.22) 14deg, rgba(150,255,205,.0) 20deg, transparent 360deg)",
                mixBlendMode: "screen",
                filter: "blur(4px)",
              }}
              initial={{ opacity: 0, rotate: -40 }}
              animate={{ opacity: 1, rotate: [-40, 70, -20, 55] }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 4.5, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }, opacity: { duration: 0.5 } }}
            />
          )}
        </AnimatePresence>

        {/* Names rising off the graves as the scan finds them. */}
        <AnimatePresence>
          {tags.map((t, i) => (
            <GraveTag key={t.id} tag={t} i={i} />
          ))}
        </AnimatePresence>
      </motion.div>
      </div>

      {/* A lantern in your hand: the ground brightens wherever you look. */}
      <motion.div className="absolute inset-0 hidden lg:block" style={{ background: lantern, mixBlendMode: "screen" }} />

      {/* Atmosphere above the scene, below the UI. */}
      <Fog className="bottom-[8%]" opacity={0.22} speed={140} seed={3} height="40%" />
      <Fog className="bottom-0" opacity={0.3} speed={80} seed={11} height="30%" />
      <motion.div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 74% 18%, rgba(90,232,168,.25), transparent 70%)", mixBlendMode: "soft-light", opacity: spill }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 85% at 55% 45%, transparent 45%, rgba(0,0,0,.75) 100%)" }} />
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(5,5,5,.88) 0%, rgba(5,5,5,.55) 30%, transparent 48%, transparent 66%, rgba(5,5,5,.6) 82%, rgba(5,5,5,.85) 100%)" }}
        animate={{ opacity: phase === "ledger" || phase === "scan" ? 1 : phase === "lot" ? 0.75 : 0.4 }}
        transition={{ duration: 1.2 }}
      />
      <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,.9), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to top, rgba(5,5,5,.95), transparent)" }} />

      {/* The burn: green fire swallows the frame for a breath. */}
      <AnimatePresence>
        {flare > 0 && (
          <motion.div
            key={flare}
            className="absolute inset-0"
            style={{ background: "radial-gradient(70% 60% at 53% 60%, rgba(150,255,205,.55), rgba(90,232,168,.2) 40%, transparent 75%)", mixBlendMode: "screen" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 0.8, 0] }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Layer({ src, mask, x, y, children }: { src: string; mask: string; x: MotionValue<number>; y: MotionValue<number>; children?: React.ReactNode }) {
  return (
    <motion.div className="absolute inset-0" style={{ x, y, maskImage: mask, WebkitMaskImage: mask }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
      {children}
    </motion.div>
  );
}

function GraveTag({ tag, i }: { tag: RisingTag; i: number }) {
  // Deterministic scatter across the cemetery band, avoiding the Barker himself.
  const slots = [36, 61, 42, 66, 47, 33, 58, 39, 64, 45, 69, 51];
  const left = slots[i % slots.length] + ((i * 7) % 5) - 2;
  const top = 56 + ((i * 13) % 20);
  const dead = tag.status === "RUGGED" || tag.status === "DUST" || tag.status === "EMPTY";
  return (
    <motion.div
      className="absolute"
      style={{ left: `${left}%`, top: `${top}%` }}
      initial={{ opacity: 0, y: 20, rotate: -6 + (i % 4) * 3, scale: 0.9 }}
      animate={{ opacity: [0, 1, 1, 0], y: [20, -10, -40, -90] }}
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
