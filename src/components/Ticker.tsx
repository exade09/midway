"use client";
import type { Burial } from "@/lib/types";
import { short, usd } from "@/lib/format";

/** The bottom marquee: every burial on the lot, scrolling past like a carnival sign. */
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
        <span key="a" className="whitespace-nowrap text-ash-2">✝ The lot is open. The ground is soft. First burial of the night wins the Barker&apos;s respect.</span>,
        <span key="b" className="whitespace-nowrap text-ash-2">✝ Paste any token into the Barker&apos;s rap sheet to see what its deployer has buried before.</span>,
      ];
  return (
    <div className="ticker-mask relative z-20 overflow-hidden border-t border-bone/10 bg-ink-0/70 py-2.5 font-type text-[12px] tracking-wide backdrop-blur-sm">
      <div className="flex w-max animate-marquee gap-12 pr-12">
        {items}
        {items.map((it, i) => (
          <span key={"dup" + i} aria-hidden>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
