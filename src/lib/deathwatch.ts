import type { DeathReading, Symptom, TokenMarket } from "./types";

/** The same rules, written for humans. Shown in the docs; keep in step with `deathReading` below. */
export const DEATH_SIGNALS: { signal: string; when: string; points: string }[] = [
  { signal: "Pool depth", when: "Liquidity under $1k / $5k / $20k", points: "30 / 20 / 10" },
  { signal: "Bleeding pool", when: "Liquidity −50% in 24h, or −30% in 6h", points: "15 / 12" },
  { signal: "Price collapse", when: "−50% in 24h, or −30% in 6h", points: "15 / 10" },
  { signal: "Holder exodus", when: "Holders −15% / −5% in 24h", points: "15 / 10" },
  { signal: "Sell pressure", when: "Sell volume > 1.5× buy volume over 6h", points: "10" },
  { signal: "Net exits", when: "More wallets leaving than arriving (6h)", points: "5" },
  { signal: "Silence", when: "Volume −70% in 24h", points: "10" },
  { signal: "Whales", when: "Top holders own > 60% / > 40%", points: "15 / 10" },
  { signal: "Live mint authority", when: "More supply can be printed", points: "15" },
  { signal: "Live freeze authority", when: "Your account can be frozen", points: "10" },
  { signal: "Dev bag", when: "Deployer still holds > 5%", points: "10" },
  { signal: "Serial launcher", when: "Deployer has launched ≥ 20 tokens", points: "10" },
  { signal: "Bots", when: "Jupiter organic score < 20", points: "10" },
  { signal: "Forgotten", when: "Jupiter no longer indexes it", points: "5" },
];

/**
 * Death Clock: a transparent 0–100 score of how close a live token is to zero.
 * Every point is traceable to a named symptom, so the barker can explain exactly why.
 */
export function deathReading(m: TokenMarket, ownerDev?: boolean): DeathReading {
  const s: Symptom[] = [];
  const add = (key: string, weight: number, text: string) => s.push({ key, weight, text });

  const liq = m.liquidityUsd ?? 0;
  const d24 = m.stats24h ?? {};
  const d6 = m.stats6h ?? {};
  const a = m.audit ?? {};

  // Pool depth: the floor everything else stands on.
  if (liq < 1_000) add("liq", 30, `Pool holds only $${fmt(liq)} — one sell empties it.`);
  else if (liq < 5_000) add("liq", 20, `Pool is shallow: $${fmt(liq)} of liquidity.`);
  else if (liq < 20_000) add("liq", 10, `Thin pool at $${fmt(liq)}.`);

  // Bleeding pool.
  if ((d24.liquidityChange ?? 0) < -50) add("bleed", 15, `Liquidity down ${pct(d24.liquidityChange)} in 24h.`);
  else if ((d6.liquidityChange ?? 0) < -30) add("bleed", 12, `Liquidity down ${pct(d6.liquidityChange)} in 6h.`);

  // Price.
  if ((d24.priceChange ?? 0) < -50) add("price", 15, `Price ${pct(d24.priceChange)} in 24h.`);
  else if ((d6.priceChange ?? 0) < -30) add("price", 10, `Price ${pct(d6.priceChange)} in 6h.`);

  // Holders walking out.
  if ((d24.holderChange ?? 0) < -15) add("exodus", 15, `${pct(-(d24.holderChange ?? 0), false)} of holders left today.`);
  else if ((d24.holderChange ?? 0) < -5) add("exodus", 10, `Holders thinning: ${pct(d24.holderChange)} in 24h.`);

  // Sell pressure.
  const buys = d6.buyVolume ?? 0;
  const sells = d6.sellVolume ?? 0;
  if (buys > 0 && sells / buys > 1.5) add("sells", 10, `Sellers outweigh buyers ${(sells / buys).toFixed(1)}× over 6h.`);
  if ((d6.numNetBuyers ?? 0) < 0) add("netsell", 5, `More wallets exiting than entering.`);

  // Interest collapsing.
  if ((d24.volumeChange ?? 0) < -70) add("silence", 10, `Volume collapsed ${pct(d24.volumeChange)} — nobody's watching.`);

  // Who controls the supply.
  const top = a.topHoldersPercentage ?? 0;
  if (top > 60) add("whales", 15, `Top holders own ${top.toFixed(0)}% of supply.`);
  else if (top > 40) add("whales", 10, `Top holders own ${top.toFixed(0)}% of supply.`);

  if (a.mintAuthorityDisabled === false) add("mint", 15, `Mint authority is live — more can be printed.`);
  if (a.freezeAuthorityDisabled === false) add("freeze", 10, `Freeze authority is live — your bag can be locked.`);

  const devBal = a.devBalancePercentage ?? 0;
  if (devBal > 5) add("devbag", 10, `Deployer still holds ${devBal.toFixed(1)}% — ready to dump.`);
  if ((a.devMints ?? 0) >= 20) add("serial", 10, `Deployer has launched ${a.devMints} tokens before this one.`);

  if (m.organicScore != null && m.organicScore < 20) add("bots", 10, `Organic score ${m.organicScore.toFixed(0)}/100 — mostly bots.`);

  if (m.source === "dexscreener" && m.holders == null) add("unindexed", 5, `Jupiter no longer indexes it.`);

  if (ownerDev) add("yours", 0, `You deployed this one.`);

  const raw = s.reduce((t, x) => t + x.weight, 0);
  const score = Math.max(0, Math.min(100, raw));
  const verdict: DeathReading["verdict"] = score >= 75 ? "LAST RITES" : score >= 50 ? "TERMINAL" : score >= 25 ? "SICKLY" : "STABLE";

  // Projection: if the pool keeps bleeding at today's rate, when is it dry?
  let daysLeft: number | null = null;
  const lc = d24.liquidityChange ?? 0;
  if (lc < -10 && liq > 0) {
    const daily = Math.min(0.95, -lc / 100);
    // Days until liquidity falls below the dead threshold at a constant daily decay.
    daysLeft = Math.max(0.1, Math.log(500 / liq) / Math.log(1 - daily));
    if (!Number.isFinite(daysLeft) || daysLeft < 0) daysLeft = 0.1;
  }

  s.sort((x, y) => y.weight - x.weight);
  return { score, verdict, symptoms: s, daysLeft };
}

function fmt(n: number) {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : n.toFixed(0);
}
function pct(n: number | undefined, sign = true) {
  const v = n ?? 0;
  return (sign && v > 0 ? "+" : "") + v.toFixed(0) + "%";
}
