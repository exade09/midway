import "server-only";
import { createHash } from "crypto";

/**
 * Weighted pick that anyone can re-run: sha256(seed) mod total tickets, walking entrants sorted by address.
 * Seed is a finalized Solana blockhash produced after the draw closed, so nobody knew it in advance.
 */
export function pickWinner(entrants: { owner: string; tickets: number }[], seed: string): string | null {
  const list = [...entrants].sort((a, b) => a.owner.localeCompare(b.owner)).map((e) => ({ ...e, w: BigInt(Math.round(e.tickets * 100)) }));
  const total = list.reduce((t, e) => t + e.w, BigInt(0));
  if (total === BigInt(0)) return null;
  const roll = BigInt("0x" + createHash("sha256").update(seed).digest("hex")) % total;
  let acc = BigInt(0);
  for (const e of list) {
    acc += e.w;
    if (roll < acc) return e.owner;
  }
  return list.at(-1)!.owner;
}
