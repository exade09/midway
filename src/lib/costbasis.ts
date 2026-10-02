import "server-only";
import { WSOL } from "./config";

const STABLES = new Set(["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);

type HTx = {
  signature: string;
  tokenTransfers?: { fromUserAccount?: string; toUserAccount?: string; mint: string; tokenAmount: number }[];
  nativeTransfers?: { fromUserAccount?: string; toUserAccount?: string; amount: number }[];
};

export interface Basis {
  /** Net SOL spent (buys minus sells). Positive = money went in. */
  netSol: number;
  /** Net stablecoin spent, in USD. */
  netUsd: number;
}

/**
 * Rough cost basis from the wallet's swap history (Helius enhanced transactions).
 * Returns an empty map without a Helius key — tickets then fall back to market proof only.
 */
export async function costBasis(owner: string, mints: string[]): Promise<Map<string, Basis>> {
  const out = new Map<string, Basis>();
  const key = process.env.HELIUS_API_KEY;
  if (!key || mints.length === 0) return out;
  const want = new Set(mints);
  let before: string | undefined;

  for (let page = 0; page < 4; page++) {
    const url = new URL(`https://api-mainnet.helius-rpc.com/v0/addresses/${owner}/transactions`);
    url.searchParams.set("api-key", key);
    url.searchParams.set("type", "SWAP");
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);
    let txs: HTx[];
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) break;
      txs = (await res.json()) as HTx[];
    } catch {
      break;
    }
    if (!txs.length) break;

    for (const tx of txs) {
      const tt = tx.tokenTransfers ?? [];
      const hit = tt.find((t) => want.has(t.mint) && (t.toUserAccount === owner || t.fromUserAccount === owner));
      if (!hit) continue;
      let sol = 0;
      let usd = 0;
      for (const n of tx.nativeTransfers ?? []) {
        if (n.fromUserAccount === owner) sol += n.amount / 1e9;
        if (n.toUserAccount === owner) sol -= n.amount / 1e9;
      }
      for (const t of tt) {
        const sign = t.fromUserAccount === owner ? 1 : t.toUserAccount === owner ? -1 : 0;
        if (t.mint === WSOL) sol += sign * t.tokenAmount;
        if (STABLES.has(t.mint)) usd += sign * t.tokenAmount;
      }
      const b = out.get(hit.mint) ?? { netSol: 0, netUsd: 0 };
      b.netSol += sol;
      b.netUsd += usd;
      out.set(hit.mint, b);
    }
    before = txs.at(-1)?.signature;
  }
  return out;
}
