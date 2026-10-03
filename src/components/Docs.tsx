"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { PanelGlow } from "./Polish";
import { Stage } from "./Stage";
import { ContractPill } from "./TopBar";
import { Toasts } from "./Toasts";
import { DEATH_SIGNALS } from "@/lib/deathwatch";
import { DRAW_HOUR_UTC, POT_CUT_BPS, TICKET_CAP, X_URL, MEMO_TAG } from "@/lib/config";
import { ease } from "@/lib/motion";

const CHAPTERS = [
  ["what", "What Midway is"],
  ["burial", "Burying a bag"],
  ["rent", "Why you get SOL back"],
  ["pot", "The pot"],
  ["tickets", "Tickets"],
  ["draw", "The nightly draw"],
  ["deathwatch", "The Death Clock"],
  ["rapsheet", "Rap sheet & graveyard"],
  ["safety", "Safety"],
  ["token", "The token"],
  ["faq", "Questions"],
] as const;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const msk = (DRAW_HOUR_UTC + 3) % 24;
const pad = (n: number) => String(n).padStart(2, "0");

export function Docs() {
  return (
    <MotionConfig reducedMotion="user">
      <PanelGlow />
      <DocsBody />
    </MotionConfig>
  );
}

function DocsBody() {
  const [active, setActive] = useState<string>("what");
  const scroller = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scroller });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  useEffect(() => {
    const els = CHAPTERS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={scroller} className="scroll-ink relative h-dvh overflow-y-auto scroll-smooth" id="docs-scroll">
      <Stage phase="receipt" mood="idle" />
      <Toasts />

      <header className="sticky top-0 z-30 border-b border-bone/[.07] bg-ink-0/70 backdrop-blur-md">
        <motion.div aria-hidden className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-lamp shadow-[0_0_10px_var(--color-lamp)]" style={{ scaleX: progress }} />
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-5 py-3.5">
          <Link href="/" className="group flex items-center gap-3">
            <span className="whitespace-nowrap font-type text-[11px] uppercase tracking-[0.2em] text-ash-2 transition-colors group-hover:text-lamp">
              ← <span className="hidden sm:inline">back to the </span>lot
            </span>
          </Link>
          <div className="hidden font-display text-[22px] tracking-[0.06em] sm:block">MIDWAY · The Rulebook</div>
          <div className="flex items-center gap-2">
            <ContractPill compact />
            <a href={X_URL} target="_blank" rel="noreferrer" className="btn btn-ghost h-8 px-3 font-mono text-[12px] normal-case tracking-normal" aria-label="Midway on X">
              <span className="sm:hidden">𝕏</span>
              <span className="hidden sm:inline">@midwaylot</span>
            </a>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1240px] gap-10 px-5 pb-32 pt-12 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 flex flex-col gap-0.5">
            <div className="label mb-3">Contents</div>
            {CHAPTERS.map(([id, title], i) => (
              <a
                key={id}
                href={`#${id}`}
                className={`group relative flex items-baseline gap-3 rounded-sm px-3 py-1.5 transition-colors ${active === id ? "text-bone" : "text-ash hover:text-ash-2"}`}
              >
                {active === id && <motion.span layoutId="toc" className="absolute inset-0 rounded-sm bg-bone/[.05] shadow-[inset_2px_0_0_var(--color-lamp)]" transition={{ duration: 0.35, ease: ease.out }} />}
                <span className="relative w-7 font-display text-[13px] text-brass/70">{ROMAN[i]}</span>
                <span className="relative font-serif text-[15px]">{title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="panel min-w-0 px-6 py-10 sm:px-12 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: ease.out }}>
            <div className="label text-lamp/80">The Rulebook</div>
            <h1 className="mt-2 font-display text-[clamp(48px,6vw,84px)] leading-[0.92]">How the lot works</h1>
            <p className="mt-5 max-w-[38rem] font-serif text-[20px] italic leading-relaxed text-bone/75">
              Everything Midway does, why it does it, and how you can check it without trusting us.
            </p>
            <Flow />
          </motion.div>

          <Chapter id="what" n={0} title="What Midway is">
            <P>
              Every memecoin you ever bought left a token account in your wallet. When the coin dies, the account stays — holding a worthless balance
              and about <M>◎0.002</M> of your SOL as rent. Nobody sells a rug. Midway is where you bury it.
            </P>
            <P>Three things happen at every burial:</P>
            <Ul
              items={[
                <>The dead tokens are burned and the account is closed, so <b>your rent comes home</b>.</>,
                <>If the token cost you real money, <b>the loss becomes a ticket</b> to tonight&apos;s draw.</>,
                <>The grave goes into the <b>public graveyard</b>, and its deployer gets a line on their rap sheet.</>,
              ]}
            />
            <P>
              Meanwhile the Barker — the rabbit — reads the tokens you still hold and scores how close each one is to zero. Burying is the ritual;
              the Death Clock is the warning.
            </P>
          </Chapter>

          <Chapter id="burial" n={1} title="Burying a bag">
            <Steps
              items={[
                ["Connect", "Phantom, Solflare or Backpack. Connecting only shares your public address."],
                ["Read", "Midway lists every SPL and Token-2022 account you own and looks up each token's market on Jupiter, falling back to DexScreener."],
                ["Choose", "Buryable bags are pre-selected. Untick anything you want to keep."],
                ["Sign", "Your wallet shows the transactions. Up to seven graves fit in one transaction."],
                ["Stub", "When the chain confirms, you get a stub: what you buried, what came back, and your tickets."],
              ]}
            />
            <H3>What counts as dead</H3>
            <Table
              head={["Status", "Meaning", "Buryable"]}
              rows={[
                [<Stamp key="r" c="text-blood">Rugged</Stamp>, "No market anywhere, or the pool holds under $500.", "Yes"],
                [<Stamp key="d" c="text-ash-2">Dust</Stamp>, "Still trades, but your bag is worth under $1 — less than a swap costs.", "Yes"],
                [<Stamp key="e" c="text-bone/60">Empty</Stamp>, "Zero balance. The account only holds your rent.", "Yes"],
                [<Stamp key="f" c="text-blood/80">Frozen</Stamp>, "The deployer froze your account. Nothing can move it.", "No"],
                [<Stamp key="s" c="text-ash">Stuck</Stamp>, "Token-2022 account with withheld transfer fees.", "No"],
                [<Stamp key="p" c="text-lamp/70">Protected</Stamp>, "SOL, stablecoins and blue-chips like JUP and liquid-staked SOL.", "Never"],
              ]}
            />
            <Note>Held NFTs are never listed. Midway only touches fungible tokens and empty accounts.</Note>
          </Chapter>

          <Chapter id="rent" n={2} title="Why you get SOL back">
            <P>
              Solana charges a deposit for every account that exists on chain. A standard token account holds <M>0.00203928 SOL</M>; Token-2022 accounts
              with extensions hold a little more. The deposit is yours, and it comes back the moment the account is closed.
            </P>
            <P>
              An account can only be closed when it&apos;s empty, so each grave is two instructions: <Code>burnChecked</Code> destroys the remaining
              tokens, <Code>closeAccount</Code> returns the rent to you. A wallet that has aped for a year typically holds 100–400 of these — ◎0.2 to ◎0.8
              sitting in the dirt.
            </P>
          </Chapter>

          <Chapter id="pot" n={3} title="The pot">
            <P>
              Midway keeps <M>{POT_CUT_BPS / 100}%</M> of the rent each burial returns. All of it goes into tonight&apos;s pot — the cut is a plain SOL
              transfer inside your burial transaction, so you see it before you sign.
            </P>
            <Ul
              items={[
                <>The pot wallet is public, so anyone can watch it fill.</>,
                <>One winner takes the night&apos;s pot.</>,
                <>A night with no tickets rolls its pot into the next.</>,
              ]}
            />
          </Chapter>

          <Chapter id="tickets" n={4} title="Tickets">
            <P>A ticket says you took a real loss. The rules are built so that faking one costs more than it could ever win.</P>
            <Table
              head={["Burial", "Tickets"]}
              rows={[
                ["Empty account", "0 — rent only"],
                ["A token you deployed yourself", "0"],
                ["A token with fewer than 50 holders and no recorded buy of ≥ ◎0.01", "0"],
                ["A real token you bought", "1"],
                ["…plus weight for what it cost you", <span key="w" className="font-mono text-[13px]">+ min(2, log₁₀(1 + loss$ / 10))</span>],
              ]}
            />
            <P>
              So a $100 loss is about 2 tickets and $1,000 or more caps at 3. One wallet holds at most <M>{TICKET_CAP}</M> tickets a night. Loss is
              estimated from your swap history: SOL and stablecoins you spent on the token, minus what you got back.
            </P>
          </Chapter>

          <Chapter id="draw" n={5} title="The nightly draw">
            <P>
              The draw closes every night at <M>{pad(DRAW_HOUR_UTC)}:00 UTC</M> ({pad(msk)}:00 MSK). The winner is picked from a seed nobody could know in advance
              and nobody can choose: the hash of the first finalized Solana block stamped at least 60 seconds after the close. It&apos;s fixed by the
              chain, not by when our server happens to run.
            </P>
            <Pre>{`block   = first finalized block with blockTime ≥ close + 60s
seed    = block.blockhash + ":" + night
total   = Σ round(tickets × 100)          over all entrants
roll    = sha256(seed) mod total
winner  = walk entrants sorted by address,
          add each one's round(tickets × 100),
          the first whose running sum passes roll`}</Pre>
            <P>
              Anyone can re-run it. <Code>/api/draw/proof?epoch=N</Code> returns the seed, the slot, every entrant with their tickets and the winner. The
              payout is a normal SOL transfer from the pot wallet, linked on the site once sent.
            </P>
          </Chapter>

          <Chapter id="deathwatch" n={6} title="The Death Clock">
            <P>
              For every token you still hold that trades, the Barker computes a score from 0 to 100: how close it looks to zero. It&apos;s a sum of
              named symptoms, so every point has a reason you can read.
            </P>
            <Table head={["Symptom", "Triggered when", "Points"]} rows={DEATH_SIGNALS.map((d) => [d.signal, d.when, <span key={d.signal} className="font-mono">{d.points}</span>])} />
            <H3>Verdicts</H3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["0–24", "Stable", "text-lamp"],
                ["25–49", "Sickly", "text-brass"],
                ["50–74", "Terminal", "text-[#d0663f]"],
                ["75–100", "Last rites", "text-blood"],
              ].map(([r, v, c]) => (
                <div key={v} className="rounded-sm bg-ink-0/50 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(236,231,218,.06)]">
                  <div className="font-mono text-[12px] text-ash">{r}</div>
                  <div className={`stamp mt-1 text-[10px] ${c}`}>{v}</div>
                </div>
              ))}
            </div>
            <P>
              When the pool is shrinking, the Barker also projects when it runs dry if today&apos;s bleed rate holds. It&apos;s a projection, not a
              prophecy — pools recover, and healthy-looking tokens get rugged in one block.
            </P>
            <Note>The Death Clock reads live market data. It is not financial advice, and the rabbit has no licence.</Note>
          </Chapter>

          <Chapter id="rapsheet" n={7} title="Rap sheet & graveyard">
            <P>
              Every burial records the token&apos;s deployer (from Jupiter&apos;s index). Over time the graveyard becomes a record no scanner has: which
              deployers keep leaving bodies, and how many people had to bury them.
            </P>
            <Ul
              items={[
                <>Paste any token or deployer into the Barker&apos;s <b>rap sheet</b> to see their launches, graduations and graves.</>,
                <>The <b>Hall of shame</b> ranks deployers by mourners.</>,
                <>The ticker at the bottom of the lot is every burial, live.</>,
              ]}
            />
          </Chapter>

          <Chapter id="safety" n={8} title="Safety">
            <Ul
              items={[
                <>Midway never holds your keys or your tokens. Every grave is a transaction you sign.</>,
                <>Reading your wallet needs no signature at all.</>,
                <>A burial transaction contains only: compute budget, a <Code>{MEMO_TAG}</Code> memo, <Code>burnChecked</Code> and <Code>closeAccount</Code> for the bags you chose, and the pot cut. If your wallet shows anything else, don&apos;t sign.</>,
                <>Burning is permanent. A burned token can&apos;t be recovered, even if it comes back to life.</>,
                <>The only official links are the ones posted by <a className="text-lamp underline decoration-dotted" href={X_URL} target="_blank" rel="noreferrer">@midwaylot</a>. Nobody from Midway will DM you.</>,
              ]}
            />
          </Chapter>

          <Chapter id="token" n={9} title="The token">
            <P>The contract address lives in the header of every page. One click copies it.</P>
            <div className="mt-4">
              <ContractPill />
            </div>
            <P>Until launch it reads &ldquo;soon&rdquo;. Any address you see elsewhere before it appears here is not ours.</P>
          </Chapter>

          <Chapter id="faq" n={10} title="Questions">
            <Faq q="I buried a token — why no tickets?" a="Empty accounts, your own launches and tokens without a real market earn rent only. If Midway can't find your buy in your swap history and the token had fewer than 50 holders, it can't tell a real loss from a staged one." />
            <Faq q="Do tickets carry over to the next night?" a="No. Each night starts from zero. Only an unclaimed pot rolls over." />
            <Faq q="What if one of my transactions fails?" a="Graves that confirmed are recorded and paid; the rest stay in your wallet untouched. Rescan and bury them again." />
            <Faq q="Can I burn NFTs or LP positions?" a="Not yet. Midway only handles fungible SPL and Token-2022 tokens." />
            <Faq q="Is this gambling?" a="The draw is free to enter — tickets come from burials you'd do for the rent anyway. Prize promotions are regulated differently around the world; check what applies where you live." />
            <Faq q="Can the Barker be wrong?" a="Yes. He reads numbers, not intentions. A clean score doesn't mean a token is safe." />
          </Chapter>

          <div className="mt-20 text-center">
            <Link href="/" className="btn btn-lamp px-10 py-4 text-sm">
              Back to the lot
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────────── pieces ───────────── */

function Chapter({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className="mt-20 scroll-mt-24"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, ease: ease.out }}
    >
      <div className="flex items-baseline gap-4">
        <span className="font-display text-[28px] text-brass/70">{ROMAN[n]}.</span>
        <h2 className="font-display text-[clamp(32px,3.6vw,46px)] leading-none">{title}</h2>
      </div>
      <div className="ink-rule mt-4" />
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 max-w-[44rem] font-serif text-[18px] leading-[1.7] text-bone/85">{children}</p>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mt-10 font-display text-[24px]">{children}</h3>;
const M = ({ children }: { children: React.ReactNode }) => <span className="font-mono text-[15px] text-lamp">{children}</span>;
const Code = ({ children }: { children: React.ReactNode }) => <code className="rounded-sm bg-ink-0/70 px-1.5 py-0.5 font-mono text-[13.5px] text-brass">{children}</code>;
const Stamp = ({ children, c }: { children: React.ReactNode; c: string }) => <span className={`stamp text-[9px] ${c}`}>{children}</span>;

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 flex max-w-[44rem] flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[1.25rem_1fr] font-serif text-[18px] leading-[1.6] text-bone/85">
          <span className="text-brass/70">✝</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ items }: { items: [string, string][] }) {
  return (
    <ol className="mt-2 grid gap-3 sm:grid-cols-5">
      {items.map(([t, d], i) => (
        <li key={t} className="rounded-sm bg-ink-0/45 p-4 shadow-[inset_0_0_0_1px_rgba(236,231,218,.06)]">
          <div className="font-mono text-[11px] text-lamp">0{i + 1}</div>
          <div className="mt-1 font-display text-[20px] leading-tight">{t}</div>
          <p className="mt-1.5 font-serif text-[14px] leading-snug text-ash-2">{d}</p>
        </li>
      ))}
    </ol>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-sm shadow-[inset_0_0_0_1px_rgba(236,231,218,.07)]">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="bg-ink-0/60">
            {head.map((h) => (
              <th key={h} className="label px-4 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-bone/[.06] align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 font-serif text-[15.5px] ${j === 0 ? "text-bone" : "text-ash-2"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pre({ children }: { children: string }) {
  return <pre className="mt-5 overflow-x-auto rounded-sm bg-ink-0/70 p-5 font-mono text-[13px] leading-[1.7] text-bone/85 shadow-[inset_0_0_0_1px_rgba(236,231,218,.07)]">{children}</pre>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticket mt-6 max-w-[44rem] rotate-[-0.4deg] px-6 py-4 font-serif text-[16px] leading-snug">
      <span className="mr-2 font-type text-[10px] uppercase tracking-[0.2em] text-blood-2">Note</span>
      {children}
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group mt-3 rounded-sm bg-ink-0/40 px-5 py-4 shadow-[inset_0_0_0_1px_rgba(236,231,218,.06)] open:bg-ink-0/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-[18px] text-bone">
        {q}
        <span className="font-display text-xl text-brass transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 font-serif text-[16.5px] leading-relaxed text-ash-2">{a}</p>
    </details>
  );
}

/** The whole loop in one strip. */
function Flow() {
  const steps = ["Dead bag", "Burn + close", "Rent home", "Ticket", "Nightly pot"];
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <motion.div key={s} className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.12, duration: 0.6, ease: ease.out }}>
          <span className={`ticket px-4 py-2 font-display text-[16px] ${i === 0 ? "opacity-70" : ""}`}>{s}</span>
          {i < steps.length - 1 && <span className="font-mono text-lamp">→</span>}
        </motion.div>
      ))}
    </div>
  );
}
