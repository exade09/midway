"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Burial } from "@/lib/types";
import { short, usd } from "@/lib/format";

/** Pixels per second. Constant whatever the feed's length, so the sign never races or crawls. */
const SPEED = 60;
const GAP = 48;

/** The Barker's patter between the graves. No full stops at the end: it's a sign, not a paragraph. */
const LINES = [
  "The lot is open. The ground is soft. First burial of the night wins the Barker's respect",
  "Paste any token into the Barker's rap sheet to see what its deployer has buried before",
  "Every real loss is a ticket. The draw closes at 21:00 MSK",
  "Nobody sells a rug. Anybody can bury one",
  "The rent under every grave comes home — about ◎0.002 apiece",
  "Your own launches don't count. The Barker checks",
];

/** Small seeded shuffle, so the server and the browser draw the same order and React doesn't complain. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function Grave({ b }: { b: Burial }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-brass/70">✝</span>
      <span className="font-display text-[15px] text-bone">${b.symbol}</span>
      <span className="text-ash">buried by</span>
      <span className="font-mono text-[12px] text-ash-2">{short(b.owner)}</span>
      {b.lossUsd ? <span className="text-blood/90">— cost them {usd(b.lossUsd)}</span> : <span className="text-ash">— rent reclaimed</span>}
    </span>
  );
}

/**
 * The bottom marquee: the Barker's lines with real burials from the lot between them —
 * one to three random graves after each line. Only burials that happened are shown; on a quiet night it's just his patter.
 * One set is measured, then repeated enough times to cover the screen twice over; the strip slides
 * by exactly one set and starts again, so the seam never shows and it never stops.
 */
export function Ticker({ feed }: { feed: Burial[] }) {
  const seed = feed.length * 7919 + (feed[0]?.sig.charCodeAt(0) ?? 0);
  const rand = rng(seed || 1);
  const pool = [...feed].sort(() => rand() - 0.5);
  const items: React.ReactNode[] = [];
  let g = 0;
  LINES.forEach((line, i) => {
    items.push(<span key={"l" + i} className="whitespace-nowrap text-ash-2">✝ {line}</span>);
    // Each grave once per set: a short feed is never padded by repeating it.
    const n = Math.min(1 + Math.floor(rand() * 3), pool.length - g);
    for (let k = 0; k < n; k++) {
      const b = pool[g++];
      items.push(<Grave key={`g${i}-${b.sig}${b.mint}`} b={b} />);
    }
  });
  // A busy lot has more graves than lines: let the rest through too, a line every few.
  while (g < pool.length) {
    const b = pool[g++];
    items.push(<Grave key={`r${g}-${b.sig}${b.mint}`} b={b} />);
    if (g % 3 === 0) items.push(<span key={"x" + g} className="whitespace-nowrap text-ash-2">✝ {LINES[g % LINES.length]}</span>);
  }

  const setRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [copies, setCopies] = useState(2);

  useLayoutEffect(() => {
    const el = setRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      setWidth(w);
      setCopies(Math.max(2, Math.ceil((window.innerWidth * 2) / w) + 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const set = (key: number) => (
    <div key={key} ref={key === 0 ? setRef : undefined} aria-hidden={key > 0 || undefined} className="flex shrink-0 items-center" style={{ gap: GAP, paddingRight: GAP }}>
      {items}
    </div>
  );

  return (
    <div className="ticker-mask relative z-20 overflow-hidden border-t border-bone/10 bg-ink-0/70 py-2.5 font-type text-[12px] tracking-wide backdrop-blur-sm">
      <div
        className="flex w-max animate-marquee"
        style={width ? ({ "--marquee-shift": `-${width}px`, animationDuration: `${width / SPEED}s` } as React.CSSProperties) : { animationPlayState: "paused" }}
      >
        {Array.from({ length: copies }, (_, i) => set(i))}
      </div>
    </div>
  );
}
