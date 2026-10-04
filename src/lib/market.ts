import "server-only";
import type { TokenMarket, WindowStats } from "./types";
import { DEAD_LIQUIDITY_USD, WSOL } from "./config";

const JUP = "https://lite-api.jup.ag";

type JupToken = {
  id: string; name: string; symbol: string; icon?: string; decimals: number;
  dev?: string; launchpad?: string; holderCount?: number; usdPrice?: number;
  liquidity?: number; mcap?: number; fdv?: number; isVerified?: boolean;
  organicScore?: number; createdAt?: string; firstPool?: { createdAt?: string };
  audit?: TokenMarket["audit"];
  stats1h?: WindowStats; stats6h?: WindowStats; stats24h?: WindowStats;
};

type DexPair = {
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string; liquidity?: { usd?: number }; marketCap?: number; fdv?: number;
  pairCreatedAt?: number; info?: { imageUrl?: string };
  priceChange?: { h1?: number; h6?: number; h24?: number };
  volume?: { h1?: number; h6?: number; h24?: number };
  txns?: Record<string, { buys: number; sells: number }>;
};

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

async function getJson<T>(url: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fromJup(t: JupToken): TokenMarket {
  return {
    mint: t.id,
    symbol: t.symbol,
    name: t.name,
    icon: t.icon,
    decimals: t.decimals,
    priceUsd: t.usdPrice ?? null,
    liquidityUsd: t.liquidity ?? null,
    mcapUsd: t.mcap ?? t.fdv ?? null,
    holders: t.holderCount ?? null,
    dev: t.dev,
    launchpad: t.launchpad,
    createdAt: t.firstPool?.createdAt ?? t.createdAt,
    verified: t.isVerified,
    organicScore: t.organicScore ?? null,
    audit: t.audit,
    stats1h: t.stats1h,
    stats6h: t.stats6h,
    stats24h: t.stats24h,
    source: "jupiter",
  };
}

function fromDex(mint: string, pairs: DexPair[]): TokenMarket {
  // The deepest pool speaks for the token.
  const p = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const tx = p.txns ?? {};
  const w = (h: "h1" | "h6" | "h24"): WindowStats => ({
    priceChange: p.priceChange?.[h],
    numBuys: tx[h]?.buys,
    numSells: tx[h]?.sells,
  });
  return {
    mint,
    symbol: p.baseToken.symbol,
    name: p.baseToken.name,
    icon: p.info?.imageUrl,
    priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
    liquidityUsd: p.liquidity?.usd ?? null,
    mcapUsd: p.marketCap ?? p.fdv ?? null,
    holders: null,
    createdAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : undefined,
    stats1h: w("h1"),
    stats6h: w("h6"),
    stats24h: w("h24"),
    source: "dexscreener",
  };
}

export function unknownMarket(mint: string): TokenMarket {
  return {
    mint,
    symbol: mint.slice(0, 4) + "…",
    name: "Unknown token",
    priceUsd: null,
    liquidityUsd: null,
    mcapUsd: null,
    holders: null,
    source: "none",
  };
}

/** Market facts for a set of mints: Jupiter first, DexScreener for whatever Jupiter has forgotten. */
export async function markets(mints: string[]): Promise<Map<string, TokenMarket>> {
  const out = new Map<string, TokenMarket>();
  const uniq = [...new Set(mints)];

  const jupBatches = await Promise.all(
    chunk(uniq, 100).map((b) => getJson<JupToken[]>(`${JUP}/tokens/v2/search?query=${b.join(",")}`)),
  );
  for (const batch of jupBatches) for (const t of batch ?? []) if (uniq.includes(t.id)) out.set(t.id, fromJup(t));

  // DexScreener fills in what Jupiter has forgotten, and gets a second say on anything Jupiter calls dead:
  // Jupiter counts only the pools it routes through, so a token it sees at $35 can still have $6k elsewhere,
  // and a live token must never be offered for burial.
  const missing = uniq.filter((m) => !out.has(m));
  const thin = uniq.filter((m) => out.has(m) && (out.get(m)!.liquidityUsd ?? 0) < DEAD_LIQUIDITY_USD);
  const ask = [...missing, ...thin];
  const dexBatches = await Promise.all(
    chunk(ask, 30).map((b) => getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${b.join(",")}`)),
  );
  const byMint = new Map<string, DexPair[]>();
  for (const batch of dexBatches)
    for (const p of batch ?? []) {
      const k = p.baseToken?.address;
      if (k && ask.includes(k)) byMint.set(k, [...(byMint.get(k) ?? []), p]);
    }
  for (const [m, ps] of byMint) {
    const dex = fromDex(m, ps);
    const jup = out.get(m);
    if (!jup) out.set(m, dex);
    else if ((dex.liquidityUsd ?? 0) > (jup.liquidityUsd ?? 0))
      out.set(m, { ...jup, liquidityUsd: dex.liquidityUsd, priceUsd: jup.priceUsd ?? dex.priceUsd });
  }

  return out;
}

export async function solUsd(): Promise<number | null> {
  const j = await getJson<Record<string, { usdPrice?: number }>>(`${JUP}/price/v3?ids=${WSOL}`, 60);
  return j?.[WSOL]?.usdPrice ?? null;
}
