"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Eyes, type Mood } from "./Eyes";
import type { DrawState, RapSheet } from "@/lib/types";
import { short, usd } from "@/lib/format";
import { ease } from "@/lib/motion";
import { TICKET_CAP } from "@/lib/config";
import { sound } from "@/lib/sound";

const PORTRAIT_EYES = [
  { x: 36.6, y: 44.1, w: 13.4, h: 13.6 },
  { x: 64.2, y: 32.4, w: 11.6, h: 12.6 },
];

const MOOD_LABEL: Record<Mood, string> = {
  idle: "watching the gate",
  scan: "reading your wallet…",
  glee: "smells corpses",
  grave: "reading the dying",
  flare: "lighting the pyre",
  sleep: "dozing",
};

export function BarkerPanel({ mood, speech, speechId = 0, typing, draw, connected }: { mood: Mood; speech: string; speechId?: number; typing: boolean; draw: DrawState | null; connected: boolean }) {
  // Portrait gaze follows the pointer too, more subtly.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 80, damping: 16 });
  const sy = useSpring(py, { stiffness: 80, damping: 16 });
  useEffect(() => {
    const on = (e: PointerEvent) => {
      px.set(((e.clientX / window.innerWidth) * 2 - 1) * 14);
      py.set(((e.clientY / window.innerHeight) * 2 - 1) * 10);
    };
    window.addEventListener("pointermove", on);
    return () => window.removeEventListener("pointermove", on);
  }, [px, py]);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.1, ease: ease.out, delay: 0.5 }}
      className="panel flex w-full max-w-[400px] flex-col"
    >
      <div className="flex items-center gap-4 px-5 pt-5">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <motion.div
            className="absolute -inset-2 rounded-full"
            animate={{ opacity: mood === "idle" ? 0.25 : mood === "grave" ? 0.5 : 0.9, scale: mood === "scan" ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 1.2, repeat: mood === "scan" ? Infinity : 0 }}
            style={{ background: `radial-gradient(circle, ${mood === "grave" ? "rgba(192,71,47,.45)" : "rgba(90,232,168,.45)"}, transparent 70%)` }}
          />
          <motion.div
            className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-bone/20"
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ duration: mood === "scan" ? 1.1 : 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/barker.webp" alt="The Barker" className="h-full w-full object-cover" />
            <Eyes spots={PORTRAIT_EYES} mood={mood} px={sx} py={sy} />
          </motion.div>
        </div>
        <div>
          <div className="font-display text-[26px] leading-none">The Barker</div>
          <AnimatePresence mode="wait">
            <motion.div key={mood} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="label mt-1.5 text-lamp/80">
              {MOOD_LABEL[mood]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative mx-5 mt-4 min-h-[148px] rounded-sm bg-ink-0/50 px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(236,231,218,.06)]">
        <span className="absolute -top-2 left-8 h-4 w-4 rotate-45 bg-ink-0/50 shadow-[inset_1px_1px_0_rgba(236,231,218,.06)]" />
        <p key={speechId} className="font-serif text-[17.5px] leading-[1.5] text-bone/90">
          <Inked text={speech} />
          {typing && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-lamp" />}
        </p>
      </div>
      <p className="mx-5 mt-2 font-serif text-[11.5px] italic text-ash">Readings come from live market data. Not financial advice — he&apos;s a rabbit.</p>

      <div className="ink-rule mt-4" />
      <DrawBooth draw={draw} connected={connected} />
      <div className="ink-rule" />
      <RapSheetBox />
    </motion.aside>
  );
}

/** Words arrive like wet ink settling into paper. */
function Inked({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((w, i) =>
        /\s+/.test(w) ? (
          w
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: "blur(3px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.35 }}
            className={/^\$[A-Z0-9]+/.test(w) ? "font-display text-bone" : /◎/.test(w) ? "lamp-text font-mono text-[15px]" : /^\d+[.,]?\d*/.test(w) ? "text-brass" : ""}
          >
            {w}
          </motion.span>
        ),
      )}
    </>
  );
}

function DrawBooth({ draw, connected }: { draw: DrawState | null; connected: boolean }) {
  const pct = draw ? Math.min(1, draw.yourTickets / TICKET_CAP) : 0;
  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between">
        <span className="label">Your tickets tonight</span>
        <span className="font-mono text-sm tabular text-bone">
          {connected && draw ? draw.yourTickets.toFixed(draw.yourTickets % 1 ? 1 : 0) : "—"} <span className="text-ash">/ {TICKET_CAP}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bone/[.06]">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-lamp-2 to-lamp" initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: ease.out }} />
      </div>
      {draw?.last && (
        <div className="mt-3 font-serif text-[13.5px] text-ash-2">
          Last night:{" "}
          {draw.last.winner ? (
            <>
              <span className="font-mono text-[12px] text-bone">{short(draw.last.winner)}</span> took <span className="font-mono text-brass">◎{(draw.last.potLamports / 1e9).toFixed(3)}</span>
              {draw.last.paidSig && (
                <a className="ml-1.5 font-type text-[10px] uppercase tracking-[0.16em] text-ash hover:text-lamp" href={`https://solscan.io/tx/${draw.last.paidSig}`} target="_blank" rel="noreferrer">
                  paid ↗
                </a>
              )}
            </>
          ) : (
            <span className="italic">no entrants — the pot rolled over.</span>
          )}
        </div>
      )}
    </div>
  );
}

function RapSheetBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ sheet: RapSheet; token: { symbol: string; name: string } | null } | null>(null);

  const go = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    sound.tick();
    try {
      const r = await fetch(`/api/rapsheet?q=${encodeURIComponent(q.trim())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Lookup failed");
      setRes(j);
      sound.stamp();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="label">Rap sheet · who launched it?</div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste a token or deployer address"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-sm bg-ink-0/60 px-3 py-2 font-mono text-[12px] text-bone placeholder:text-ash/70 outline-none ring-1 ring-bone/10 focus:ring-lamp/60"
        />
        <button className="btn btn-ghost px-3 py-2" disabled={busy}>
          {busy ? "…" : "Read"}
        </button>
      </form>
      <AnimatePresence>
        {err && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 font-serif text-sm italic text-blood">
            {err}
          </motion.p>
        )}
        {res && (
          <motion.div
            initial={{ opacity: 0, y: 8, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: ease.out }}
            className="ticket mt-3 px-4 py-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-type text-[10px] uppercase tracking-[0.2em] opacity-70">Deployer</span>
              <span className="font-mono text-[11px]">{short(res.sheet.deployer, 5)}</span>
            </div>
            {res.token && <div className="mt-1 font-display text-lg leading-none">${res.token.symbol}</div>}
            <p className="mt-1.5 font-serif text-[14px] leading-snug">{res.sheet.verdict}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-black/15 pt-2 font-mono text-[11px] tabular">
              <span>launched <b>{res.sheet.launches ?? "?"}</b></span>
              <span>buried <b>{res.sheet.buried}</b></span>
              <span>cost <b>{usd(res.sheet.lossUsd || null)}</b></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
