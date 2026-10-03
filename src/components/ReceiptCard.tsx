"use client";
import { motion } from "motion/react";
import type { Receipt } from "@/lib/types";
import { epochLabel } from "@/lib/epoch";
import { short, sol, usd } from "@/lib/format";
import { ease } from "@/lib/motion";
import { SITE_URL, X_HANDLE } from "@/lib/config";
import { useState } from "react";

/** The stub you keep: proof of loss, and your admission to tonight's draw. */
export function ReceiptCard({ receipt, onClose, demo }: { receipt: Receipt; onClose: () => void; demo?: boolean }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  const url = `${origin}/r/${receipt.id}`;
  const n = receipt.burials.length;
  const tweet = `I just buried ${n} dead ${n === 1 ? "bag" : "bags"} at the Midway and took ◎${sol(receipt.reclaimedLamports - receipt.potLamports, 4)} of rent back.\n\nTicket No. ${String(receipt.id).padStart(6, "0")} for tonight's draw.\n\n@${X_HANDLE}`;
  const shown = receipt.burials.slice(0, 7);

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto px-4 py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink-0/50" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-[460px]"
        initial={{ y: 80, rotate: -6, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, rotate: -1.2, opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: ease.out }}
      >
        <div className="ticket relative px-8 pb-7 pt-6 shadow-[0_40px_90px_-10px_rgba(0,0,0,.9)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-type text-[10px] uppercase tracking-[0.3em] opacity-70">Midway · proof of loss</div>
              <div className="mt-1 font-display text-[40px] leading-none">Admit One</div>
              <div className="mt-1 font-serif text-[15px] italic">to the draw of {epochLabel(receipt.epoch)} · 21:00 MSK</div>
            </div>
            <div className="text-right font-type text-[11px] leading-tight">
              <div className="opacity-60">No.</div>
              <div className="text-xl tracking-wider">{String(receipt.id).padStart(6, "0")}</div>
            </div>
          </div>

          <div className="my-4 border-t-2 border-dashed border-black/25" />

          <ul className="space-y-1 font-type text-[13px]">
            {shown.map((b) => (
              <li key={b.sig + b.mint} className="flex items-baseline justify-between gap-3">
                <span className="truncate">✝ ${b.symbol}</span>
                <span className="shrink-0 tabular opacity-80">{b.lossUsd ? usd(b.lossUsd) : b.tickets === 0 ? "rent only" : "—"}</span>
              </li>
            ))}
            {n > shown.length && <li className="opacity-60">… and {n - shown.length} more</li>}
          </ul>

          <div className="my-4 border-t-2 border-dashed border-black/25" />

          <div className="grid grid-cols-2 gap-y-2 font-type text-[13px] tabular">
            <span className="opacity-70">Rent reclaimed</span>
            <span className="text-right">◎{sol(receipt.reclaimedLamports - receipt.potLamports)}</span>
            <span className="opacity-70">Into the pot</span>
            <span className="text-right">◎{sol(receipt.potLamports)}</span>
            {receipt.lossUsd != null && (
              <>
                <span className="opacity-70">Est. loss buried</span>
                <span className="text-right">{usd(receipt.lossUsd)}</span>
              </>
            )}
            <span className="font-bold">Tickets</span>
            <span className="text-right text-lg font-bold">{receipt.tickets.toFixed(receipt.tickets % 1 ? 2 : 0)}</span>
          </div>

          <div className="mt-5 flex items-end gap-4 font-mono text-[10px] opacity-70">
            <span>{short(receipt.owner, 6)}</span>
            {!demo && receipt.sigs[0] && (
              <a className="underline decoration-dotted" href={`https://solscan.io/tx/${receipt.sigs[0]}`} target="_blank" rel="noreferrer">
                verify on chain ↗
              </a>
            )}
          </div>

          <motion.div
            className="stamp absolute bottom-5 right-7 text-[22px] text-blood"
            initial={{ scale: 2.4, opacity: 0, rotate: -24 }}
            animate={{ scale: 1, opacity: 0.85, rotate: -9 }}
            transition={{ delay: 0.9, duration: 0.25, ease: "easeIn" }}
          >
            Buried
          </motion.div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a className="btn btn-lamp" href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            Post the stub on 𝕏
          </a>
          {!demo && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(url);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Back to the lot
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
