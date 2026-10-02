import type { TokenMarket } from "./types";

/**
 * Tickets for one burial. Designed so that farming costs more than it pays:
 *  - empty accounts earn nothing (only rent back)
 *  - your own launches earn nothing
 *  - the token must prove it was a real market: ≥50 holders, or a recorded buy of ≥0.01 SOL
 *  - loss adds weight on a log scale and caps at 3×
 */
export function ticketsFor(opts: {
  burnedRaw: string;
  owner: string;
  market: TokenMarket | undefined;
  netSol: number | null;
  lossUsd: number | null;
}): number {
  const { burnedRaw, owner, market, netSol, lossUsd } = opts;
  if (burnedRaw === "0") return 0;
  if (market?.dev && market.dev === owner) return 0;
  const realMarket = (market?.holders ?? 0) >= 50;
  const realBuy = (netSol ?? 0) >= 0.01;
  if (!realMarket && !realBuy) return 0;
  const bonus = lossUsd && lossUsd > 0 ? Math.min(2, Math.log10(1 + lossUsd / 10)) : 0;
  return Math.round((1 + bonus) * 100) / 100;
}
