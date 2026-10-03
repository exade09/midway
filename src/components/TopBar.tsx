"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { DrawState } from "@/lib/types";
import { hms, short, sol } from "@/lib/format";
import { sound } from "@/lib/sound";
import { TOKEN_CA, X_HANDLE, X_URL } from "@/lib/config";
import { toast } from "@/lib/toast";
import { ease } from "@/lib/motion";

export function useNow(period = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [period]);
  return now;
}

export function TopBar({
  draw,
  demo,
  onDemo,
  onLeaveDemo,
  onGraveyard,
}: {
  draw: DrawState | null;
  demo: boolean;
  onDemo: () => void;
  onLeaveDemo: () => void;
  onGraveyard: () => void;
}) {
  const now = useNow();
  const left = draw ? new Date(draw.closesAt).getTime() - now : null;
  const lastHour = left != null && left < 3_600_000;
  return (
    <header className="relative z-20 px-4 pt-4 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Midway home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/barker.webp" alt="" className="hidden h-9 w-9 rounded-full ring-1 ring-bone/15 sm:block" />
            <div>
              <div className="font-display text-[22px] leading-none tracking-[0.06em] sm:text-[26px]">MIDWAY</div>
              <div className="bulbs mt-1 h-1 w-full opacity-70" />
            </div>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            <NavButton onClick={onGraveyard}>Graveyard</NavButton>
            <NavLink href="/docs">Docs</NavLink>
          </nav>
        </div>

        <div className="hidden items-center gap-5 lg:flex xl:gap-6">
          <Meter k="Tonight's pot">
            <span className="text-brass" style={{ textShadow: "0 0 18px rgba(201,166,90,.35)" }}>
              ◎ {draw ? sol(draw.potLamports, 3) : "—"}
            </span>
          </Meter>
          <div className="h-9 w-px bg-bone/10" />
          <Meter k="Draw in">
            <motion.span
              className={lastHour ? "text-brass" : "text-bone"}
              animate={lastHour ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
              transition={lastHour ? { duration: 1, repeat: Infinity } : {}}
            >
              {left != null ? hms(left) : "--:--:--"}
            </motion.span>
          </Meter>
          <div className="hidden h-9 w-px bg-bone/10 xl:block" />
          <div className="hidden xl:block">
            <Meter k="Tickets">
              <span className="text-ash-2">{draw ? Math.round(draw.ticketsTotal).toLocaleString("en-US") : "—"}</span>
            </Meter>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ContractPill />
          </div>
          <MuteButton />
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost hidden h-10 gap-2 px-3 normal-case tracking-normal sm:inline-flex"
            aria-label="Midway on X — @midwaylot"
            title="@midwaylot"
          >
            <XLogo />
            <span className="hidden font-mono text-[12px] 2xl:inline">@{X_HANDLE}</span>
          </a>
          <WalletButton demo={demo} onDemo={onDemo} onLeaveDemo={onLeaveDemo} />
        </div>
      </div>

      {/* Phones and narrow screens: the contract, the pot and the links on a second line. */}
      <div className="mt-3 flex items-center justify-between gap-2 lg:hidden">
        <div className="sm:hidden">
          <ContractPill compact />
        </div>
        <div className="hidden font-mono text-[13px] tabular text-brass sm:block">
          ◎ {draw ? sol(draw.potLamports, 3) : "—"} <span className="text-ash">· draw in {left != null ? hms(left) : "--:--:--"}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="label hover:text-bone" onClick={onGraveyard}>Graveyard</button>
          <Link className="label hover:text-bone" href="/docs">Docs</Link>
          <a className="label hover:text-bone sm:hidden" href={X_URL} target="_blank" rel="noreferrer">𝕏</a>
        </div>
      </div>
      <div className="mt-2 text-center font-mono text-[12.5px] tabular text-brass sm:hidden">
        ◎ {draw ? sol(draw.potLamports, 3) : "—"} pot <span className="text-ash">· draw in {left != null ? hms(left) : "--:--:--"}</span>
      </div>
      <nav className="mt-2 hidden items-center justify-start gap-1 lg:flex xl:hidden">
        <NavButton onClick={onGraveyard}>Graveyard</NavButton>
        <NavLink href="/docs">Docs</NavLink>
      </nav>
    </header>
  );
}

function Meter({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="text-left">
      <div className="label">{k}</div>
      <div className="font-mono text-xl font-medium tabular">{children}</div>
    </div>
  );
}

const navCls = "relative px-3 py-2 font-type text-[11px] uppercase tracking-[0.2em] text-ash-2 transition-colors hover:text-bone after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-lamp after:transition-transform after:duration-300 hover:after:scale-x-100";
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={navCls} onMouseEnter={() => sound.tick()}>
      {children}
    </Link>
  );
}
function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={() => { sound.start(); onClick(); }} className={navCls} onMouseEnter={() => sound.tick()}>
      {children}
    </button>
  );
}

function XLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.09 14.47Z" />
    </svg>
  );
}

/** The token's contract address. One click copies it; before launch it just says "soon". */
export function ContractPill({ compact }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const live = TOKEN_CA.length > 0;
  const copy = async () => {
    sound.start();
    if (!live) {
      toast("The token isn't live yet — watch @midwaylot for the CA.");
      return;
    }
    try {
      await navigator.clipboard.writeText(TOKEN_CA);
      setCopied(true);
      sound.tick();
      toast("Contract address copied", "ok");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Couldn't reach the clipboard — select the address by hand.", "error");
    }
  };
  return (
    <button
      onClick={copy}
      title={live ? `${TOKEN_CA} — click to copy` : "Token launching soon"}
      className={`group flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[2px] px-3 shadow-[inset_0_0_0_1px_rgba(201,166,90,.35)] transition-[box-shadow,background] hover:bg-brass/[.06] hover:shadow-[inset_0_0_0_1px_rgba(201,166,90,.7),0_0_24px_-6px_rgba(201,166,90,.5)] ${compact ? "h-8 px-2.5" : ""}`}
    >
      <span className="font-type text-[10px] uppercase tracking-[0.22em] text-brass">CA</span>
      <span className="font-mono text-[12px] text-bone/90">{live ? short(TOKEN_CA, compact ? 4 : 5) : "soon"}</span>
      {live && (
        <span className="relative h-3.5 w-3.5 text-ash-2 transition-colors group-hover:text-brass">
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.svg key="ok" viewBox="0 0 16 16" className="absolute inset-0 text-lamp" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </motion.svg>
            ) : (
              <motion.svg key="cp" viewBox="0 0 16 16" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <rect x="5" y="5" width="8.5" height="8.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
      )}
    </button>
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
  const usable = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);

  // With autoConnect on, selecting a new wallet connects by itself. Re-picking the already-selected
  // wallet changes nothing in the provider, so that case needs an explicit connect().
  const pick = (name: (typeof usable)[number]["adapter"]["name"]) => {
    onClose();
    if (wallet?.adapter.name === name) connect().catch(() => {});
    else select(name);
  };

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
                  onClick={() => pick(w.adapter.name)}
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
