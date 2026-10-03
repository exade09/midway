"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Burial } from "@/lib/types";
import { short, usd } from "@/lib/format";

/** Pixels per second. Constant whatever the feed's length, so the sign never races or crawls. */
const SPEED = 60;
const GAP = 48;

/**
 * The bottom marquee: every burial on the lot, scrolling past right to left like a carnival sign.
 * One set is measured, then repeated enough times to cover the screen twice over; the strip slides
 * by exactly one set and starts again, so the seam never shows and it never stops.
 */
export function Ticker({ feed }: { feed: Burial[] }) {
  const items = feed.length
    ? feed.map((b) => (
        <span key={b.sig + b.mint} className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-brass/70">✝</span>
          <span className="font-display text-[15px] text-bone">${b.symbol}</span>
          <span className="text-ash">buried by</span>
          <span className="font-mono text-[12px] text-ash-2">{short(b.owner)}</span>
          {b.lossUsd ? <span className="text-blood/90">— cost them {usd(b.lossUsd)}</span> : <span className="text-ash">— rent reclaimed</span>}
        </span>
      ))
    : [
        <span key="a" className="whitespace-nowrap text-ash-2">✝ The lot is open. The ground is soft. First burial of the night wins the Barker&apos;s respect</span>,
        <span key="b" className="whitespace-nowrap text-ash-2">✝ Paste any token into the Barker&apos;s rap sheet to see what its deployer has buried before</span>,
      ];

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
