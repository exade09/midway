"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Transaction } from "@solana/web3.js";
import { Stage, type Phase, type RisingTag } from "./Stage";
import type { Mood } from "./Eyes";
import { Intro } from "./Intro";
import { TopBar } from "./TopBar";
import { Gate } from "./Gate";
import { Ledger } from "./Ledger";
import { BarkerPanel } from "./BarkerPanel";
import { Ritual, type RitualStage } from "./Ritual";
import { ReceiptCard } from "./ReceiptCard";
import { Ticker } from "./Ticker";
import { Graveyard } from "./Graveyard";
import { Toasts } from "./Toasts";
import type { GraveyardData } from "@/lib/types";
import { toast } from "@/lib/toast";
import type { Bag, Burial, DrawState, Receipt, ScanResult } from "@/lib/types";
import { isBurnable } from "@/lib/classify";
import { IDLE_LINES } from "@/lib/barker";
import { speak } from "@/lib/speech";
import { sound } from "@/lib/sound";
import { buildBurns, potCut, sendAndConfirm } from "@/lib/burn";
import { epochOf } from "@/lib/epoch";
import { ease } from "@/lib/motion";

const ACTS: Record<Phase, string> = {
  intro: "",
  lot: "Act I · The Gate",
  scan: "Act II · The Reading",
  ledger: "Act III · The Ledger",
  ritual: "Act IV · The Burial",
  receipt: "Act V · The Stub",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const noop = () => () => {};
function readSeen() {
  try {
    return sessionStorage.getItem("midway:entered") === "1";
  } catch {
    return false;
  }
}

export function Midway({ initialReceipt = null }: { initialReceipt?: Receipt | null }) {
  const { publicKey, signAllTransactions, signTransaction } = useWallet();
  const params = useSyncExternalStore(noop, () => window.location.search, () => "");
  const seen = useSyncExternalStore(noop, readSeen, () => false);
  const [clicked, setClicked] = useState(false);
  const [demoChoice, setDemo] = useState<boolean | null>(null);
  const entered = clicked || seen || params.includes("skip");
  const demo = demoChoice ?? params.includes("demo");
  const [rawPhase, setPhase] = useState<Phase>("intro");
  const phase: Phase = !entered ? "intro" : rawPhase === "intro" ? (initialReceipt ? "receipt" : "lot") : rawPhase;
  const [mood, setMood] = useState<Mood>("idle");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [speech, setSpeech] = useState(IDLE_LINES[0]);
  const [typing, setTyping] = useState(false);
  const [speechId, setSpeechId] = useState(0);
  const [tags, setTags] = useState<RisingTag[]>([]);
  const [flare, setFlare] = useState(0);
  const [ritual, setRitual] = useState<RitualStage | null>(null);
  const [ritualBags, setRitualBags] = useState<Bag[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(initialReceipt);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [yard, setYard] = useState<GraveyardData | null>(null);
  const [yardOpen, setYardOpen] = useState(false);
  const feed: Burial[] = yard?.recent ?? [];
  const [earned, setEarned] = useState(0);
  const pendingSigs = useRef<string[]>([]);

  const owner = demo ? "demo" : (publicKey?.toBase58() ?? null);

  // Returning visitors skip the cold open; audio still needs a first touch to wake.
  useEffect(() => {
    if (!seen) return;
    const wake = () => sound.start();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [seen]);

  const enter = () => {
    try {
      sessionStorage.setItem("midway:entered", "1");
    } catch {}
    setClicked(true);
    setPhase(initialReceipt ? "receipt" : "lot");
  };

  /** Say a line locally, word by word — same feel as a streamed one. */
  const sayLocal = useCallback(async (text: string) => {
    setSpeechId((n) => n + 1);
    setTyping(true);
    const words = text.split(/(?<=\s)/);
    let acc = "";
    for (const w of words) {
      acc += w;
      setSpeech(acc);
      await wait(22);
    }
    setTyping(false);
  }, []);

  const sayRemote = useCallback(async (body: unknown, fallback: string) => {
    setSpeechId((n) => n + 1);
    setSpeech("");
    setTyping(true);
    try {
      const full = await speak(body, setSpeech);
      if (!full) setSpeech(fallback);
    } catch {
      setSpeech(fallback);
    } finally {
      setTyping(false);
    }
  }, []);

  // Idle patter at the gate.
  useEffect(() => {
    if (phase !== "lot") return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % IDLE_LINES.length;
      void sayLocal(IDLE_LINES[i]);
    }, 9000);
    return () => clearInterval(id);
  }, [phase, sayLocal]);

  // Draw state and the graveyard feed, kept fresh.
  const drawKey = useRef("");
  const refreshDraw = useCallback(async () => {
    const q = new URLSearchParams();
    if (owner && owner !== "demo") q.set("owner", owner);
    if (demo) q.set("demo", "1");
    const key = q.toString();
    drawKey.current = key;
    const r = await fetch(`/api/draw?${key}`).catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      if (drawKey.current === key) setDraw(j);
    }
  }, [owner, demo]);
  useEffect(() => {
    const id0 = setTimeout(refreshDraw, 0);
    const id = setInterval(refreshDraw, 30_000);
    return () => {
      clearTimeout(id0);
      clearInterval(id);
    };
  }, [refreshDraw]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const r = await fetch(`/api/graveyard${demo ? "?demo=1" : ""}`).catch(() => null);
      if (live && r?.ok) {
        const j = await r.json();
        if (live) setYard(j);
      }
    };
    const id0 = setTimeout(load, 0);
    const id = setInterval(load, 45_000);
    return () => {
      live = false;
      clearTimeout(id0);
      clearInterval(id);
    };
  }, [demo]);

  /* ─────────────── The reading ─────────────── */

  const runScan = useCallback(
    async (who: string, fresh = false) => {
      setPhase("scan");
      setMood("scan");
      setTags([]);
      setFocus(null);
      sound.sweep(2.8);
      void sayLocal("Hold still. Let me read what you've been carrying…");
      const t0 = Date.now();
      let res: ScanResult;
      try {
        const r = await fetch(`/api/scan?owner=${who}${fresh ? "&fresh=1" : ""}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "The lamp went out");
        res = j;
      } catch (e) {
        setPhase("lot");
        setMood("idle");
        toast(`Scan failed: ${(e as Error).message}`, "error", 5000);
        void sayLocal(`The lamp sputtered — ${(e as Error).message}. Try me again.`);
        return;
      }

      // Names rise off the graves as they're found.
      const reveal = [...res.bags.filter(isBurnable), ...res.bags.filter((b) => b.status === "ALIVE")].slice(0, 12);
      for (let i = 0; i < reveal.length; i++) {
        await wait(170);
        const b = reveal[i];
        setTags((t) => [...t, { id: b.account, label: b.market.symbol, status: b.status }]);
        sound.tick();
      }
      const min = 3000 - (Date.now() - t0);
      if (min > 0) await wait(min);

      setScan(res);
      setSelected(new Set(res.bags.filter(isBurnable).map((b) => b.account)));
      setPhase("ledger");
      setMood(res.totals.burnable ? "glee" : "idle");
      if (res.totals.burnable) sound.stamp();
      setTimeout(() => setTags([]), 1500);
      void sayRemote({ kind: "scan", scan: { ...res, bags: res.bags.map(slim) } }, "");
    },
    [sayLocal, sayRemote],
  );

  // The wallet is an outside system: when it changes, start a fresh reading (or go back to the gate).
  useEffect(() => {
    if (!entered) return;
    const id = setTimeout(() => {
      if (owner) void runScan(owner);
      else {
        setScan(null);
        setPhase((p) => (p === "receipt" ? p : "lot"));
        setMood("idle");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [owner, entered, runScan]);

  const focusBag = (b: Bag) => {
    setFocus(b.account);
    setMood(b.status === "ALIVE" ? ((b.death?.score ?? 0) >= 50 ? "grave" : "idle") : isBurnable(b) ? "glee" : "grave");
    void sayRemote({ kind: "bag", bag: slim(b) }, "");
  };

  /* ─────────────── The burial ─────────────── */

  const chosen = useMemo(() => (scan ? scan.bags.filter((b) => isBurnable(b) && selected.has(b.account)) : []), [scan, selected]);

  const finish = async (bags: Bag[], r: Receipt) => {
    setRitual({ kind: "bury" });
    setMood("flare");
    setFlare((f) => f + 1);
    sound.whoosh();
    const shown = Math.min(9, bags.length);
    for (let i = 0; i < shown; i++) setTimeout(() => sound.thud(), (0.25 + i * 0.18 + 0.75) * 1000);
    for (let i = 0; i < 6; i++) setTimeout(() => sound.coin(1 + i * 0.06), 1400 + i * 220);
    await wait(2600 + shown * 180);
    sound.bell();
    sound.tear();
    // Bury them in the ledger too.
    const gone = new Set(bags.map((b) => b.account));
    setScan((s) => (s ? { ...s, bags: s.bags.filter((b) => !gone.has(b.account)), totals: { ...s.totals, burnable: s.totals.burnable - gone.size, rentLamports: s.totals.rentLamports - bags.reduce((t, b) => t + b.rentLamports, 0) } } : s));
    setSelected(new Set());
    setReceipt(r);
    setEarned((e) => e + r.tickets);
    setRitual(null);
    setPhase("receipt");
    setMood("glee");
    void refreshDraw();
  };

  const record = async (who: string, bags: Bag[]) => {
    setRitual({ kind: "record" });
    const r = await fetch("/api/burn/record", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: who, sigs: pendingSigs.current }) });
    const j = await r.json();
    if (!r.ok) throw new Error(`Buried on chain, but the ledger didn't take it: ${j.error ?? r.status}. Try again to record.`);
    pendingSigs.current = [];
    await finish(bags, j as Receipt);
  };

  const bury = async () => {
    const bags = chosen;
    if (!bags.length) return;
    setRitualBags(bags);
    setPhase("ritual");
    setMood("scan");
    sound.stamp();

    if (demo) {
      setRitual({ kind: "sign", done: 0, total: 1 });
      await wait(1500);
      setRitual({ kind: "send", done: 1, total: 1 });
      await wait(900);
      const rent = bags.reduce((t, b) => t + b.rentLamports, 0);
      const cut = potCut(rent, true);
      const burials: Burial[] = bags.map((b, i) => {
        const loss = b.status === "EMPTY" ? null : Math.round(40 + ((i * 97) % 600));
        return { sig: "demo", owner: "demo", mint: b.mint, symbol: b.market.symbol, name: b.market.name, rentLamports: b.rentLamports, lossUsd: loss, tickets: loss ? 1 + Math.min(2, Math.log10(1 + loss / 10)) : 0, epoch: epochOf(), createdAt: new Date().toISOString() };
      });
      const tickets = Math.min(25, burials.reduce((t, b) => t + b.tickets, 0));
      await finish(bags, { id: 417, owner: "DeMo…1111", epoch: epochOf(), sigs: [], reclaimedLamports: rent, potLamports: cut, tickets: Math.round(tickets * 100) / 100, lossUsd: burials.reduce((t, b) => t + (b.lossUsd ?? 0), 0), burials, createdAt: new Date().toISOString() });
      return;
    }

    if (!publicKey || (!signAllTransactions && !signTransaction)) return;
    const who = publicKey.toBase58();
    try {
      if (pendingSigs.current.length) return await record(who, bags);
      const txs = await buildBurns(bags, publicKey);
      setRitual({ kind: "sign", done: 0, total: txs.length });
      let signed: Transaction[];
      if (signAllTransactions) signed = await signAllTransactions(txs);
      else {
        signed = [];
        for (const t of txs) {
          signed.push(await signTransaction!(t));
          setRitual({ kind: "sign", done: signed.length, total: txs.length });
        }
      }
      for (let i = 0; i < signed.length; i++) {
        setRitual({ kind: "send", done: i, total: signed.length });
        try {
          pendingSigs.current.push(await sendAndConfirm(signed[i]));
          sound.thud();
        } catch (e) {
          if (!pendingSigs.current.length) throw e;
          break; // Record what made it into the ground.
        }
      }
      await record(who, bags);
    } catch (e) {
      const msg = (e as Error).message ?? "Unknown error";
      setMood("grave");
      setRitual({ kind: "error", message: /reject|denied|cancel/i.test(msg) ? "You stepped back from the grave. Nothing was signed." : msg });
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    if (scan) {
      setPhase("ledger");
      const t = receipt?.tickets ?? 0;
      void sayLocal(
        t > 0
          ? `Rest easy. That stub holds ${t.toFixed(t % 1 ? 1 : 0)} tickets for tonight's draw, and the pot's fatter for it.`
          : "Rest easy. Rent's home. Empty plots don't earn tickets — bury a real loss for that.",
      );
    } else setPhase("lot");
    if (initialReceipt) window.history.replaceState(null, "", "/");
  };

  const left =
    phase === "lot" || (phase === "receipt" && !scan) ? (
      <Gate key="gate" onDemo={() => setDemo(true)} stats={yard?.stats} />
    ) : phase === "scan" ? (
      <ScanCard key="scan" found={tags.length} />
    ) : scan ? (
      <Ledger
        key="ledger"
        scan={scan}
        selected={selected}
        onToggle={(a) => setSelected((s) => { const n = new Set(s); if (n.has(a)) n.delete(a); else n.add(a); return n; })}
        onSelectAll={(all) => setSelected(new Set(all ?? []))}
        focus={focus}
        onFocus={focusBag}
        onBury={bury}
        demo={demo}
        onRescan={() => owner && runScan(owner, true)}
        busy={phase === "ritual"}
      />
    ) : null;

  return (
    <main className="relative flex min-h-dvh flex-col lg:h-dvh">
      <Stage phase={phase} mood={mood} tags={tags} flare={flare} />

      <AnimatePresence>{entered && <TopBarIn key="top" draw={draw} demo={demo} onGraveyard={() => setYardOpen(true)} onDemo={() => setDemo(true)} onLeaveDemo={() => { setDemo(false); setScan(null); setEarned(0); }} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {entered && ACTS[phase] && (
          <motion.div
            key={phase}
            className="pointer-events-none relative z-10 mt-3 text-center font-type text-[11px] uppercase tracking-[0.4em] text-ash-2"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.4em" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: ease.out }}
          >
            — {ACTS[phase]} —
          </motion.div>
        )}
      </AnimatePresence>

      {/* On phones the panels stack, so leave a window onto the scene first. */}
      {entered && <div className="h-[24vh] shrink-0 lg:hidden" />}
      {entered && (
        <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[minmax(0,580px)_1fr_minmax(0,400px)] lg:px-8">
          {/* Safe centring: when a column is taller than the screen it scrolls instead of sliding under the top bar. */}
          <div className="flex min-h-0 flex-col justify-center-safe scroll-quiet lg:overflow-y-auto lg:overscroll-contain">
            <AnimatePresence mode="wait">{left}</AnimatePresence>
          </div>
          <div className="hidden lg:block" />
          <div className="flex min-h-0 flex-col justify-center-safe lg:items-end scroll-quiet lg:overflow-y-auto lg:overscroll-contain">
            <BarkerPanel mood={mood} speech={speech} speechId={speechId} typing={typing} draw={draw && demo ? { ...draw, yourTickets: Math.min(25, earned) } : draw} connected={!!owner} />
          </div>
        </div>
      )}

      {entered && <Ticker feed={feed} />}

      <AnimatePresence>{!entered && <Intro key="intro" onEnter={enter} />}</AnimatePresence>
      <Graveyard open={yardOpen} onClose={() => setYardOpen(false)} data={yard} />
      <Toasts />
      <AnimatePresence>
        {phase === "ritual" && ritual && (
          <Ritual
            key="ritual"
            bags={ritualBags}
            stage={ritual}
            reclaimed={ritualBags.reduce((t, b) => t + b.rentLamports, 0) - potCut(ritualBags.reduce((t, b) => t + b.rentLamports, 0), demo)}
            onRetry={bury}
            onCancel={() => { setRitual(null); setPhase("ledger"); setMood("idle"); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{phase === "receipt" && receipt && <ReceiptCard key="receipt" receipt={receipt} onClose={closeReceipt} demo={demo || receipt.sigs.length === 0} />}</AnimatePresence>
    </main>
  );
}

function TopBarIn(props: React.ComponentProps<typeof TopBar>) {
  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: ease.out, delay: 0.6 }} className="relative z-20">
      <TopBar {...props} />
    </motion.div>
  );
}

function ScanCard({ found }: { found: number }) {
  return (
    <motion.section key="scan" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.7, ease: ease.out }} className="max-w-[520px]">
      <div className="label text-lamp/80">The reading</div>
      <h2 className="mt-2 font-display text-[clamp(40px,4.6vw,64px)] leading-[0.95]">
        Walking
        <br />
        your graves…
      </h2>
      <div className="mt-6 flex items-center gap-4">
        <div className="relative h-2 w-56 overflow-hidden rounded-full bg-bone/[.06]">
          <motion.div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-lamp to-transparent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }} />
        </div>
        <span className="font-mono text-sm tabular text-ash-2">{found} found</span>
      </div>
      <p className="mt-4 font-serif italic text-ash-2">Every token account, every market, every deployer. Read-only.</p>
    </motion.section>
  );
}

/** Strip a bag down to what the Barker needs, so we don't post the whole market blob back to the server. */
function slim(b: Bag): Bag {
  const { market } = b;
  return { ...b, market: { ...market, icon: undefined } };
}
