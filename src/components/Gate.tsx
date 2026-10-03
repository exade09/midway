"use client";
import { motion } from "motion/react";
import { ease } from "@/lib/motion";
import { WalletButton } from "./TopBar";
import { POT_CUT_BPS } from "@/lib/config";
import type { GraveyardData } from "@/lib/types";
import { sol, usd } from "@/lib/format";

const RULES = [
  ["I", "Bury any rugged, dusted or empty token.", "The rent locked under each grave comes home — about ◎0.002 apiece."],
  ["II", "Every real loss is a ticket.", "Weighted by what the bag cost you. Up to 25 a night. Your own launches don't count."],
  ["III", "One winner, every night at 21:00 MSK.", `The pot is our ${POT_CUT_BPS / 100}% cut of every burial. All of it, every night.`],
  ["IV", "The Barker watches the living.", "He reads your bags that still trade and tells you which one is next to die."],
] as const;

export function Gate({ onDemo, stats }: { onDemo: () => void; stats?: GraveyardData["stats"] | null }) {
  return (
    <motion.section
      key="gate"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30, transition: { duration: 0.5 } }}
      transition={{ duration: 1.1, ease: ease.out, delay: 0.3 }}
      className="flex max-w-[560px] flex-col justify-center"
    >
      <div className="label text-lamp/80">Open nightly · Solana</div>
      <h2 className="mt-3 font-display text-[clamp(44px,5.4vw,78px)] leading-[0.92]">
        Hand over
        <br />a dead bag.
      </h2>
      <p className="mt-5 max-w-[30rem] font-serif text-[19px] leading-relaxed text-bone/80">
        Nobody sells a rug. But you can bury it — get your SOL rent back, and every real loss is a ticket to tonight&apos;s pot.
      </p>

      <ol className="mt-8 flex flex-col gap-4">
        {RULES.map(([n, t, d], i) => (
          <motion.li
            key={n}
            className="grid grid-cols-[2.4rem_1fr] gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: ease.out, delay: 0.7 + i * 0.12 }}
          >
            <span className="pt-0.5 font-display text-xl text-brass/80">{n}.</span>
            <span>
              <span className="block font-serif text-[17px] text-bone">{t}</span>
              <span className="block font-serif text-[15px] italic text-ash-2">{d}</span>
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <WalletButton demo={false} onDemo={onDemo} onLeaveDemo={() => {}} big />
        <button className="btn btn-ghost px-6 py-4" onClick={onDemo}>
          Walk the demo lot
        </button>
      </div>
      <p className="mt-4 font-serif text-sm italic text-ash">Read-only until you sign. Stablecoins and blue-chips are never offered for burial.</p>

      {stats && stats.graves > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-bone/10 pt-5 font-mono text-[13px] tabular text-ash-2"
        >
          <span><b className="font-medium text-bone">{stats.graves.toLocaleString("en-US")}</b> graves dug</span>
          <span><b className="font-medium text-lamp">◎{sol(stats.rentLamports, 2)}</b> rent sent home</span>
          {stats.lossUsd > 0 && <span><b className="font-medium text-blood">{usd(stats.lossUsd)}</b> in losses laid to rest</span>}
        </motion.div>
      )}
    </motion.section>
  );
}
