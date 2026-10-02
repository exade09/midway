"use client";
import { useEffect } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "motion/react";
import type { Bag } from "@/lib/types";
import { ease } from "@/lib/motion";
import { sol } from "@/lib/format";

export type RitualStage = { kind: "sign"; done: number; total: number } | { kind: "send"; done: number; total: number } | { kind: "record" } | { kind: "bury" } | { kind: "error"; message: string };

/**
 * The burial. While the wallet signs, the bags hang in a fan above an open grave.
 * When the chain confirms, they drop one by one, earth lands, the lamp flares and the rent counts home.
 */
export function Ritual({ bags, stage, reclaimed, onRetry, onCancel }: { bags: Bag[]; stage: RitualStage; reclaimed: number; onRetry: () => void; onCancel: () => void }) {
  const show = bags.slice(0, 7);
  const dropping = stage.kind === "bury";
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => sol(v));

  useEffect(() => {
    if (!dropping) return;
    const c = animate(count, reclaimed, { duration: 1.6 + show.length * 0.18, ease: ease.out, delay: 0.4 });
    return () => c.stop();
  }, [dropping, reclaimed, count, show.length]);

  const caption =
    stage.kind === "sign"
      ? `Sign the burial in your wallet${stage.total > 1 ? ` · ${stage.done}/${stage.total}` : ""}`
      : stage.kind === "send"
        ? `Lowering the coffins · ${stage.done}/${stage.total}`
        : stage.kind === "record"
          ? "The chain is witnessing…"
          : stage.kind === "bury"
            ? "Rest now."
            : "The ground refused.";

  return (
    <motion.div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
      <div className="absolute inset-0 bg-ink-0/75 backdrop-blur-[3px]" />

      {/* The fan of tags hanging over the grave. */}
      <div className="relative h-[250px] w-full max-w-[760px]">
        {show.map((b, i) => {
          const n = show.length;
          const k = i - (n - 1) / 2;
          // A gentle arc, like tickets pegged on a line over the grave.
          const angle = k * 5;
          const x = k * 92;
          const arc = k * k * 7;
          return (
            <motion.div
              key={b.account}
              className="absolute left-1/2 top-6"
              initial={{ opacity: 0, y: -60 + arc, x, rotate: angle * 2 }}
              animate={
                dropping
                  ? { opacity: [1, 1, 0], y: [arc, arc - 14, 260], x: x * 0.15, rotate: angle * 3, scale: [1, 1, 0.6], transition: { duration: 0.9, delay: 0.25 + i * 0.18, ease: ease.drop, times: [0, 0.2, 1] } }
                  : { opacity: 1, y: [arc, arc - 6, arc], x, rotate: angle, transition: { y: { duration: 2.6 + i * 0.13, repeat: Infinity, ease: "easeInOut" }, default: { duration: 0.8, delay: i * 0.06, ease: ease.out } } }
              }
            >
              <div className="flex -translate-x-1/2 flex-col items-center">
                <div className="h-10 w-px bg-gradient-to-b from-transparent to-bone/40" />
                <div className="ticket px-3 py-2 text-center shadow-[0_14px_30px_rgba(0,0,0,.7)]">
                  <div className="font-display text-base leading-none">${b.market.symbol}</div>
                  <div className="mt-1 font-type text-[8px] tracking-[0.2em] text-blood">{b.status}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {bags.length > show.length && (
          <div className="absolute inset-x-0 -bottom-9 text-center font-type text-xs tracking-[0.2em] text-ash-2">+ {bags.length - show.length} more</div>
        )}
        {/* The open grave */}
        <div className="absolute inset-x-0 bottom-0 mx-auto h-10 w-[300px] rounded-[50%] bg-ink-0 shadow-[0_0_60px_20px_rgba(0,0,0,.9),inset_0_8px_20px_rgba(0,0,0,1)]" />
        <motion.div
          className="absolute inset-x-0 bottom-2 mx-auto h-8 w-[280px] rounded-[50%]"
          style={{ background: "radial-gradient(closest-side, rgba(120,255,200,.6), rgba(90,232,168,.15), transparent)" }}
          animate={{ opacity: dropping ? [0, 1, 0.4, 0.9, 0.2] : 0.1 }}
          transition={{ duration: 2.4, delay: 0.5 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="relative mt-10 font-display text-[clamp(26px,3vw,40px)]">
          {caption}
        </motion.p>
      </AnimatePresence>

      {dropping && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="relative mt-3 text-center">
          <div className="label">rent coming home</div>
          <div className="lamp-text mt-1 font-mono text-5xl tabular">◎<motion.span>{text}</motion.span></div>
        </motion.div>
      )}

      {stage.kind === "error" && (
        <div className="relative mt-4 flex max-w-md flex-col items-center gap-4 text-center">
          <p className="font-serif text-lg italic text-blood">{stage.message}</p>
          <div className="flex gap-3">
            <button className="btn btn-lamp" onClick={onRetry}>Try again</button>
            <button className="btn btn-ghost" onClick={onCancel}>Back to the ledger</button>
          </div>
        </div>
      )}
      {(stage.kind === "sign" || stage.kind === "send" || stage.kind === "record") && (
        <p className="relative mt-3 font-serif text-sm italic text-ash">Each grave burns its tokens and closes the account. Nothing else moves.</p>
      )}
    </motion.div>
  );
}
