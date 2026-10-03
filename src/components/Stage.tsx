"use client";
import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "motion/react";
import type { Mood } from "./Eyes";
import { Fog } from "./Fog";
import { Particles } from "./Particles";
import { HangingLamp, Skyline } from "./Skyline";
import { sound } from "@/lib/sound";
import { ease } from "@/lib/motion";

export type Phase = "intro" | "lot" | "scan" | "ledger" | "ritual" | "receipt";

/** The bulb hangs over the open middle of the screen, between the two panels, 30vh down. */
const LAMP_X = 0.56;
const lampY = (h: number) => h * 0.3 - 24;

const CAMERA: Record<Phase, { scale: number; y: string; filter: string }> = {
  intro: { scale: 1.08, y: "2%", filter: "brightness(0) blur(4px)" },
  lot: { scale: 1, y: "0%", filter: "brightness(1) blur(0px)" },
  scan: { scale: 1.05, y: "-1.5%", filter: "brightness(1.05) blur(0px)" },
  ledger: { scale: 1.02, y: "0%", filter: "brightness(0.9) blur(0px)" },
  ritual: { scale: 1.1, y: "-2.5%", filter: "brightness(0.8) blur(0px)" },
  receipt: { scale: 1.04, y: "0%", filter: "brightness(0.55) blur(3px)" },
};

export interface RisingTag {
  id: string;
  label: string;
  status: string;
}

/**
 * The scene behind everything. Deliberately quiet: a night horizon, one lamp, fog.
 * It reacts to the story — the lamp sputters while reading, flares at a burial, a searchlight sweeps during scans —
 * but never competes with the panels.
 */
export function Stage({ phase, mood, tags = [], flare = 0 }: { phase: Phase; mood: Mood; tags?: RisingTag[]; flare?: number }) {
  // Gentle parallax: the far horizon drifts against the pointer.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const farX = useTransform(sx, (v) => v * -10);
  const farY = useTransform(sy, (v) => v * -5);
  const lanternX = useTransform(sx, (v) => `${(v + 1) * 50}%`);
  const lanternY = useTransform(sy, (v) => `${(v + 1) * 50}%`);
  const lantern = useTransform([lanternX, lanternY], ([x, y]) => `radial-gradient(460px 340px at ${x} ${y}, rgba(220,240,230,.05), transparent 70%)`);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  // The lamp is a living light: it catches on entry, sputters now and then, flares at a burial.
  const lamp = useMotionValue(phase === "intro" ? 0 : 1);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "intro") lamp.set(0);
    else if (lamp.get() < 0.5) {
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
      t = setTimeout(
        () => {
          if (phaseRef.current !== "intro") {
            const base = nervous ? 1.2 : 1;
            animate(lamp, [base, 0.4, base * 0.9, 0.6, base], { duration: 0.32 });
            if (Math.random() < 0.6) sound.flicker();
          }
          loop();
        },
        nervous ? 900 + Math.random() * 1500 : 5000 + Math.random() * 7000,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [lamp]);

  useEffect(() => {
    if (!flare) return;
    animate(lamp, [1, 2.4, 1.5, 2, 1], { duration: 1.4, ease: "easeOut" });
  }, [flare, lamp]);

  const glowOpacity = useTransform(lamp, (v) => Math.min(1, v * 0.85));
  const coneOpacity = useTransform(lamp, (v) => Math.min(0.85, v * 0.45));
  const bulbOpacity = useTransform(lamp, (v) => Math.min(1, 0.15 + v * 0.85));
  // A reading that worries the Barker warms the light toward amber.
  const tint = mood === "grave" ? "201,140,90" : "90,232,168";

  const cam = CAMERA[phase];
  const scanning = phase === "scan";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-ink-0">
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 70%" }}
        initial={CAMERA.intro}
        animate={phase === "ritual" ? { ...cam, x: [0, -3, 4, -2, 1, 0] } : { ...cam, x: 0 }}
        transition={{ duration: phase === "lot" ? 2.4 : 1.6, ease: ease.inOut, x: { duration: 0.6, delay: 0.8 } }}
      >
        <motion.div className="absolute -inset-[2%]" style={{ x: farX, y: farY }}>
          <Skyline />
        </motion.div>

        <HangingLamp
          x={LAMP_X}
          glow={
            <>
              <motion.div
                className="absolute left-1/2 top-[26px] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(${tint},.32) 0%, rgba(${tint},.1) 22%, rgba(${tint},.03) 45%, transparent 70%)`, opacity: glowOpacity, mixBlendMode: "screen" }}
              />
              <motion.div
                className="absolute left-1/2 top-[40px] h-[70vh] w-[90vh] -translate-x-1/2"
                style={{ background: `radial-gradient(50% 60% at 50% 0%, rgba(${tint},.09), rgba(${tint},.025) 45%, transparent 75%)`, opacity: coneOpacity, mixBlendMode: "screen" }}
              />
              <motion.div className="absolute left-1/2 top-[26px] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9ffec] blur-[6px]" style={{ opacity: bulbOpacity }} />
            </>
          }
        />

        <Particles lamp={{ x: LAMP_X, y: lampY }} heat={scanning ? 1 : phase === "ritual" ? 1.5 : 0} />

        {/* Searchlight sweeping the field during a scan. */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="beam"
              className="absolute top-[30vh] h-[220vh] w-[220vh] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${LAMP_X * 100}%`,
                background: "conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(150,255,205,0) 6deg, rgba(150,255,205,.13) 12deg, rgba(150,255,205,0) 18deg, transparent 360deg)",
                mixBlendMode: "screen",
                filter: "blur(6px)",
              }}
              initial={{ opacity: 0, rotate: -30 }}
              animate={{ opacity: 1, rotate: [-30, 60, -10, 45] }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 5, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }, opacity: { duration: 0.6 } }}
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

      <motion.div className="absolute inset-0 hidden lg:block" style={{ background: lantern, mixBlendMode: "screen" }} />

      <Fog className="bottom-[10%]" opacity={0.16} speed={150} seed={3} height="34%" />
      <Fog className="bottom-0" opacity={0.22} speed={90} seed={11} height="26%" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 55% 40%, transparent 50%, rgba(0,0,0,.7) 100%)" }} />
      <div className="absolute inset-x-0 top-0 h-28" style={{ background: "linear-gradient(to bottom, rgba(5,5,5,.85), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: "linear-gradient(to top, rgba(5,5,5,.9), transparent)" }} />

      {/* The burial: green fire fills the frame for a breath. */}
      <AnimatePresence>
        {flare > 0 && (
          <motion.div
            key={flare}
            className="absolute inset-0"
            style={{ background: "radial-gradient(60% 55% at 50% 62%, rgba(150,255,205,.4), rgba(90,232,168,.14) 40%, transparent 75%)", mixBlendMode: "screen" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 0.75, 0] }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GraveTag({ tag, i }: { tag: RisingTag; i: number }) {
  // Scatter across the open middle of the frame, rising from the field of crosses.
  const slots = [38, 61, 44, 66, 49, 35, 57, 41, 63, 47, 69, 53];
  const left = slots[i % slots.length] + ((i * 7) % 5) - 2;
  const top = 68 + ((i * 13) % 12);
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
