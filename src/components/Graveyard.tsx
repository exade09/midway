"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GraveyardData } from "@/lib/types";
import { ago, short, sol, usd } from "@/lib/format";
import { ease } from "@/lib/motion";
import { sound } from "@/lib/sound";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** The public record: every grave dug on the lot, and the deployers who keep filling it. */
export function Graveyard({ open, onClose, data }: { open: boolean; onClose: () => void; data: GraveyardData | null }) {
  const [tab, setTab] = useState<"fresh" | "shame">("fresh");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <div className="absolute inset-0 bg-ink-0/60 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-label="The Graveyard"
            className="panel relative flex h-full w-full max-w-[520px] flex-col rounded-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.4, ease: ease.inOut } }}
            transition={{ duration: 0.7, ease: ease.out }}
          >
            <div className="flex items-start justify-between px-7 pt-7">
              <div>
                <div className="label text-lamp/80">The public record</div>
                <h2 className="mt-1 font-display text-[44px] leading-none">The Graveyard</h2>
              </div>
              <button className="btn btn-ghost h-10 w-10 p-0 text-lg" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-px bg-bone/[.06] sm:grid-cols-4">
              {[
                ["Graves", data ? data.stats.graves.toLocaleString("en-US") : "—"],
                ["Mourners", data ? data.stats.mourners.toLocaleString("en-US") : "—"],
                ["Rent home", data ? `◎${sol(data.stats.rentLamports, 2)}` : "—"],
                ["Losses buried", data ? usd(data.stats.lossUsd) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink-1/95 px-5 py-3.5">
                  <div className="label text-[9.5px]">{k}</div>
                  <div className="mt-1 font-mono text-lg tabular text-bone">{v}</div>
                </div>
              ))}
            </div>

            <nav className="flex gap-1 px-5 pt-4">
              {(
                [
                  ["fresh", "Fresh graves"],
                  ["shame", "Hall of shame"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setTab(k); sound.tick(); }}
                  className={`relative px-3 py-2 font-type text-[11px] uppercase tracking-[0.18em] ${tab === k ? "text-bone" : "text-ash hover:text-ash-2"}`}
                >
                  {label}
                  {tab === k && <motion.span layoutId="gy-ink" className="absolute inset-x-2 -bottom-px h-[2px] bg-lamp shadow-[0_0_10px_var(--color-lamp)]" />}
                </button>
              ))}
            </nav>
            <div className="ink-rule" />

            <div className="scroll-ink fade-y min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {tab === "fresh" ? (
                data?.recent.length ? (
                  data.recent.map((b, i) => (
                    <motion.div
                      key={b.sig + b.mint}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }}
                      className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 rounded-sm px-3 py-2.5 hover:bg-bone/[.035]"
                    >
                      <span className="text-center font-display text-brass/70">✝</span>
                      <div className="min-w-0">
                        <div className="font-display text-[18px] leading-tight">${b.symbol}</div>
                        <div className="font-mono text-[11px] text-ash">
                          {short(b.owner)} · {ago(b.createdAt)}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[12px] tabular">
                        {b.lossUsd ? <span className="text-blood">−{usd(b.lossUsd)}</span> : <span className="text-ash">rent only</span>}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <Empty text="No graves yet tonight. The first one is always the loneliest." />
                )
              ) : data?.deployers.length ? (
                <>
                  <p className="px-3 pb-3 font-serif text-[14px] italic text-ash-2">Deployers ranked by how many people have had to bury their tokens here.</p>
                  {data.deployers.map((d, i) => (
                    <motion.a
                      key={d.deployer}
                      href={d.deployer.includes("…") ? undefined : `https://solscan.io/account/${d.deployer}`}
                      target="_blank"
                      rel="noreferrer"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                      className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-3 rounded-sm px-3 py-3 hover:bg-bone/[.035]"
                    >
                      <span className={`font-display text-xl ${i < 3 ? "text-blood" : "text-ash-2"}`}>{ROMAN[i]}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] text-bone">{d.deployer.includes("…") ? d.deployer : short(d.deployer, 6)}</div>
                        <div className="font-serif text-[13px] italic text-ash-2">
                          {d.buried} token{d.buried === 1 ? "" : "s"} buried · {d.mourners} mourner{d.mourners === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[12px] tabular text-blood">{d.lossUsd ? usd(d.lossUsd) : ""}</div>
                    </motion.a>
                  ))}
                </>
              ) : (
                <Empty text="The hall is empty. It fills as people bury what deployers left behind." />
              )}
            </div>
            <p className="border-t border-bone/10 px-7 py-4 font-serif text-[12.5px] italic text-ash">
              Every row is a verified burn on Solana. Deployers come from Jupiter&apos;s token index at burial time.
            </p>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-16 text-center font-serif italic text-ash">{text}</p>;
}
