"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { DrawState } from "@/lib/types";
import { hms, short, sol } from "@/lib/format";
import { sound } from "@/lib/sound";
import { X_HANDLE } from "@/lib/config";
import { ease } from "@/lib/motion";

export function useNow(period = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [period]);
  return now;
}

export function TopBar({ draw, demo, onDemo, onLeaveDemo }: { draw: DrawState | null; demo: boolean; onDemo: () => void; onLeaveDemo: () => void }) {
  const now = useNow();
  const left = draw ? new Date(draw.closesAt).getTime() - now : null;
  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-4 lg:px-8">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/barker.webp" alt="" className="hidden h-9 w-9 rounded-full ring-1 ring-bone/15 sm:block" />
        <div>
          <div className="font-display text-[22px] leading-none tracking-[0.06em] sm:text-[26px]">MIDWAY</div>
          <div className="bulbs mt-1 h-1 w-full opacity-70" />
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <div className="text-right">
          <div className="label">Tonight&apos;s pot</div>
          <div className="font-mono text-xl font-medium tabular text-brass" style={{ textShadow: "0 0 18px rgba(201,166,90,.35)" }}>
            ◎ {draw ? sol(draw.potLamports, 3) : "—"}
          </div>
        </div>
        <div className="h-9 w-px bg-bone/10" />
        <div>
          <div className="label">Draw in</div>
          <div className="font-mono text-xl tabular text-bone">{left != null ? hms(left) : "--:--:--"}</div>
        </div>
        <div className="h-9 w-px bg-bone/10" />
        <div>
          <div className="label">Tickets</div>
          <div className="font-mono text-xl tabular text-ash-2">{draw ? Math.round(draw.ticketsTotal).toLocaleString("en-US") : "—"}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MuteButton />
        <a href={`https://x.com/${X_HANDLE}`} target="_blank" rel="noreferrer" className="btn btn-ghost hidden h-10 w-10 p-0 font-display text-base normal-case tracking-normal sm:inline-flex" aria-label="Midway on X">
          𝕏
        </a>
        <WalletButton demo={demo} onDemo={onDemo} onLeaveDemo={onLeaveDemo} />
      </div>
    </header>
  );
}

function MuteButton() {
  const muted = useSyncExternalStore((cb) => sound.onChange(cb), () => sound.muted, () => false);
  return (
    <button className="btn btn-ghost h-10 w-10 p-0" aria-label={muted ? "Unmute" : "Mute"} onClick={() => { sound.start(); sound.setMuted(!muted); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>}
      </svg>
    </button>
  );
}

export function WalletButton({ demo, onDemo, onLeaveDemo, big }: { demo: boolean; onDemo: () => void; onLeaveDemo: () => void; big?: boolean }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const [open, setOpen] = useState(false);

  if (demo)
    return (
      <button className={`btn btn-ghost ${big ? "" : "h-10"}`} onClick={onLeaveDemo}>
        <span className="hidden sm:inline">Demo lot · </span>leave
      </button>
    );
  if (publicKey)
    return (
      <button className={`btn btn-ghost font-mono normal-case tracking-normal ${big ? "" : "h-10"}`} onClick={() => disconnect()} title="Disconnect">
        <span className="h-1.5 w-1.5 rounded-full bg-lamp shadow-[0_0_8px_var(--color-lamp)]" />
        {short(publicKey.toBase58())}
      </button>
    );
  return (
    <>
      <button className={`btn btn-lamp ${big ? "px-8 py-4 text-sm" : "h-10"}`} onClick={() => { sound.start(); setOpen(true); }} disabled={connecting}>
        {connecting ? "Opening…" : "Connect wallet"}
      </button>
      <WalletPicker open={open} onClose={() => setOpen(false)} onDemo={onDemo} />
    </>
  );
}

function WalletPicker({ open, onClose, onDemo }: { open: boolean; onClose: () => void; onDemo: () => void }) {
  const { wallets, select, connect, wallet } = useWallet();
  const [picked, setPicked] = useState<string | null>(null);
  const usable = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);

  // select() only chooses; connect() has to follow once the adapter is actually swapped in.
  useEffect(() => {
    if (picked && wallet?.adapter.name === picked) {
      connect().catch(() => {}).finally(() => setPicked(null));
      onClose();
    }
  }, [picked, wallet, connect, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-0/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="panel w-full max-w-sm p-6"
            initial={{ y: 24, opacity: 0, rotate: -1 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.45, ease: ease.out }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="label">The ticket booth</div>
            <h3 className="mt-1 font-display text-3xl">Show your wallet</h3>
            <div className="ink-rule my-4" />
            <div className="flex flex-col gap-2">
              {usable.length === 0 && <p className="font-serif text-ash-2">No Solana wallet found in this browser. Install Phantom, Solflare or Backpack — or walk the demo lot.</p>}
              {usable.map((w) => (
                <button
                  key={w.adapter.name}
                  className="btn btn-ghost justify-start gap-3 normal-case tracking-normal"
                  onClick={() => {
                    setPicked(w.adapter.name);
                    select(w.adapter.name);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.adapter.icon} alt="" className="h-6 w-6" />
                  <span className="font-serif text-lg">{w.adapter.name}</span>
                </button>
              ))}
            </div>
            <div className="ink-rule my-4" />
            <button className="btn btn-ghost w-full" onClick={() => { onDemo(); onClose(); }}>
              Walk the demo lot
            </button>
            <p className="mt-3 text-center font-serif text-sm italic text-ash">We only read. Nothing moves without your signature.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
