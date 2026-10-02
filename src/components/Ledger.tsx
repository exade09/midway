"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import type { Bag, ScanResult } from "@/lib/types";
import { isBurnable } from "@/lib/classify";
import { compact, short, sol, usd } from "@/lib/format";
import { potCut } from "@/lib/burn";
import { ease } from "@/lib/motion";
import { sound } from "@/lib/sound";

type Tab = "bury" | "watch" | "keep";

const STAMP: Record<string, string> = {
  RUGGED: "text-blood",
  DUST: "text-ash-2",
  EMPTY: "text-bone/50",
  FROZEN: "text-blood/80",
  STUCK: "text-ash",
  PROTECTED: "text-lamp/70",
  "LAST RITES": "text-blood",
  TERMINAL: "text-blood/80",
  SICKLY: "text-brass",
  STABLE: "text-lamp",
};

export function Ledger({
  scan,
  selected,
  onToggle,
  onSelectAll,
  focus,
  onFocus,
  onBury,
  onRescan,
  busy,
  demo,
}: {
  scan: ScanResult;
  selected: Set<string>;
  onToggle: (account: string) => void;
  onSelectAll: (accounts: string[] | null) => void;
  focus: string | null;
  onFocus: (b: Bag) => void;
  onBury: () => void;
  onRescan: () => void;
  busy: boolean;
  demo?: boolean;
}) {
  const bury = useMemo(() => scan.bags.filter(isBurnable), [scan]);
  const watch = useMemo(() => scan.bags.filter((b) => b.status === "ALIVE").sort((a, b) => (b.death?.score ?? 0) - (a.death?.score ?? 0)), [scan]);
  const keep = useMemo(() => scan.bags.filter((b) => ["PROTECTED", "FROZEN", "STUCK"].includes(b.status)), [scan]);
  const [tab, setTab] = useState<Tab>(bury.length ? "bury" : "watch");

  const chosen = bury.filter((b) => selected.has(b.account));
  const rent = chosen.reduce((t, b) => t + b.rentLamports, 0);
  const cut = potCut(rent, demo);
  const allOn = bury.length > 0 && chosen.length === bury.length;

  const list = tab === "bury" ? bury : tab === "watch" ? watch : keep;

  return (
    <motion.section
      key="ledger"
      initial={{ opacity: 0, x: -40, rotate: -0.6 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.4 } }}
      transition={{ duration: 0.9, ease: ease.out }}
      className="panel flex max-h-full min-h-0 w-full max-w-[580px] flex-col"
    >
      <div className="flex items-end justify-between px-6 pt-5">
        <div>
          <div className="label">The ledger · {scan.demo ? "demo lot" : short(scan.owner)}</div>
          <h2 className="mt-0.5 font-display text-[34px] leading-none">Your bags</h2>
        </div>
        <button className="label pb-1 transition-colors hover:text-lamp" onClick={onRescan} disabled={busy}>
          ↻ rescan
        </button>
      </div>

      <LayoutGroup id="tabs">
        <nav className="mt-4 flex gap-1 px-4">
          {(
            [
              ["bury", "To bury", bury.length],
              ["watch", "Deathwatch", watch.length],
              ["keep", "Untouchable", keep.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => { setTab(k); sound.tick(); }}
              className={`relative px-3 py-2 font-type text-[11px] uppercase tracking-[0.18em] transition-colors ${tab === k ? "text-bone" : "text-ash hover:text-ash-2"}`}
            >
              {label} <span className={tab === k ? "text-lamp" : ""}>{n}</span>
              {tab === k && <motion.span layoutId="tab-ink" className="absolute inset-x-2 -bottom-px h-[2px] bg-lamp shadow-[0_0_10px_var(--color-lamp)]" />}
            </button>
          ))}
        </nav>
      </LayoutGroup>
      <div className="ink-rule" />

      {tab === "bury" && bury.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5">
          <button className="label hover:text-bone" onClick={() => onSelectAll(allOn ? null : bury.map((b) => b.account))}>
            {allOn ? "☒ clear" : "☐ select all"}
          </button>
          <span className="label">rent held</span>
        </div>
      )}
      {tab === "watch" && (
        <p className="px-6 py-2.5 font-serif text-[14px] italic text-ash-2">Live bags, ranked by how close they are to zero. Tap one and the Barker reads it.</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.length === 0 && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-10 text-center font-serif italic text-ash">
              {tab === "bury" ? "Nothing to bury. A clean wallet — rare on this lot." : tab === "watch" ? "No living memecoins to watch." : "Nothing untouchable here."}
            </motion.p>
          )}
          {list.map((b, i) =>
            tab === "watch" ? (
              <WatchRow key={b.account} bag={b} i={i} active={focus === b.account} onClick={() => onFocus(b)} />
            ) : (
              <BuryRow
                key={b.account}
                bag={b}
                i={i}
                tab={tab}
                checked={selected.has(b.account)}
                active={focus === b.account}
                onToggle={() => { onToggle(b.account); sound.tick(); }}
                onFocus={() => onFocus(b)}
              />
            ),
          )}
        </AnimatePresence>
      </div>

      {tab === "bury" && bury.length > 0 && (
        <div className="border-t border-bone/10 px-6 py-4">
          <div className="grid grid-cols-3 gap-3 font-mono text-[12px] tabular">
            <Stat k="Graves" v={String(chosen.length)} />
            <Stat k="Rent back" v={`◎${sol(rent - cut)}`} hi />
            <Stat k="To the pot" v={`◎${sol(cut)}`} brass />
          </div>
          <button className="btn btn-lamp mt-4 w-full py-4 text-sm" disabled={!chosen.length || busy} onClick={onBury}>
            {chosen.length ? `Bury ${chosen.length} ${chosen.length === 1 ? "bag" : "bags"}` : "Choose the dead"}
          </button>
          <p className="mt-2 text-center font-serif text-[12.5px] italic text-ash">Burning is permanent. You sign every grave yourself.</p>
        </div>
      )}
    </motion.section>
  );
}

function Stat({ k, v, hi, brass }: { k: string; v: string; hi?: boolean; brass?: boolean }) {
  return (
    <div>
      <div className="label text-[9.5px]">{k}</div>
      <motion.div key={v} initial={{ opacity: 0.3, y: -3 }} animate={{ opacity: 1, y: 0 }} className={`mt-0.5 text-[15px] ${hi ? "lamp-text" : brass ? "text-brass" : "text-bone"}`}>
        {v}
      </motion.div>
    </div>
  );
}

function TokenIcon({ bag }: { bag: Bag }) {
  const [err, setErr] = useState(false);
  const src = bag.market.icon;
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-ink-3 ring-1 ring-bone/10">
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover grayscale-[.6]" onError={() => setErr(true)} loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-sm text-ash-2">{bag.market.symbol.slice(0, 2)}</span>
      )}
    </div>
  );
}

function BuryRow({ bag, i, tab, checked, active, onToggle, onFocus }: { bag: Bag; i: number; tab: Tab; checked: boolean; active: boolean; onToggle: () => void; onFocus: () => void }) {
  const can = tab === "bury";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 14) * 0.035, duration: 0.45, ease: ease.out } }}
      exit={{ opacity: 0, x: 30, filter: "blur(4px)", transition: { duration: 0.35 } }}
      onClick={onFocus}
      className={`group grid cursor-pointer grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-sm px-3 py-2.5 transition-colors ${active ? "bg-bone/[.06]" : "hover:bg-bone/[.035]"}`}
    >
      {can ? (
        <button
          role="checkbox"
          aria-checked={checked}
          aria-label={`Bury ${bag.market.symbol}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`flex h-5 w-5 items-center justify-center border transition-all ${checked ? "border-lamp bg-lamp/15 text-lamp shadow-[0_0_10px_rgba(90,232,168,.4)]" : "border-bone/25 text-transparent group-hover:border-bone/50"}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
      ) : (
        <span className="w-5" />
      )}
      <TokenIcon bag={bag} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`truncate font-display text-[18px] leading-tight ${checked ? "text-bone" : "text-bone/85"}`}>${bag.market.symbol}</span>
          <span className={`stamp text-[8.5px] ${STAMP[bag.status]}`}>{bag.status}</span>
        </div>
        <div className="truncate font-serif text-[13px] italic text-ash">
          {bag.status === "EMPTY" ? "empty plot" : `${compact(bag.uiAmount)} · ${bag.reason}`}
        </div>
      </div>
      <div className="text-right font-mono text-[12px] tabular">
        <div className="text-ash-2">◎{sol(bag.rentLamports)}</div>
        <div className="text-[11px] text-ash">{bag.valueUsd != null && bag.status !== "EMPTY" ? usd(bag.valueUsd) : ""}</div>
      </div>
    </motion.div>
  );
}

function WatchRow({ bag, i, active, onClick }: { bag: Bag; i: number; active: boolean; onClick: () => void }) {
  const d = bag.death!;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.5, ease: ease.out } }}
      onClick={onClick}
      className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-sm px-3 py-3 text-left transition-colors ${active ? "bg-bone/[.06]" : "hover:bg-bone/[.035]"}`}
    >
      <DeathDial score={d.score} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[18px] leading-tight">${bag.market.symbol}</span>
          <span className={`stamp text-[8.5px] ${STAMP[d.verdict]}`}>{d.verdict}</span>
        </div>
        <div className="truncate font-serif text-[13px] italic text-ash-2">{d.symptoms[0]?.text ?? "No symptoms worth naming."}</div>
        {d.daysLeft != null && d.daysLeft < 30 && (
          <div className="mt-0.5 font-type text-[10px] uppercase tracking-[0.16em] text-blood/90">
            pool dry in ~{d.daysLeft < 1 ? "hours" : `${d.daysLeft.toFixed(1)}d`} at this bleed
          </div>
        )}
      </div>
      <div className="text-right font-mono text-[12px] tabular">
        <div className="text-bone/80">{usd(bag.valueUsd)}</div>
        <a
          href={`https://jup.ag/swap/${bag.mint}-SOL`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="label text-[9px] hover:text-lamp"
        >
          exit ↗
        </a>
      </div>
    </motion.button>
  );
}

/** The Death Clock: a dial that fills toward midnight. */
export function DeathDial({ score, size = 46 }: { score: number; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#c0472f" : score >= 50 ? "#d0663f" : score >= 25 ? "#c9a65a" : "#5ae8a8";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(236,231,218,.08)" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, k) => (
          <line key={k} x1="22" y1="2" x2="22" y2="5" stroke="rgba(236,231,218,.18)" strokeWidth="1" transform={`rotate(${k * 30} 22 22)`} />
        ))}
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: ease.out }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[12px] font-semibold tabular" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
