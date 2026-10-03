import "server-only";
import { rpc } from "./rpc";

/** Draw seeds wait this long after the close, so the seed block can't exist before entries are final. */
export const SEED_DELAY_S = 60;

async function blockTime(slot: number): Promise<number | null> {
  try {
    return await rpc<number | null>("getBlockTime", [slot]);
  } catch {
    return null; // skipped slot, or pruned
  }
}

/** First produced slot at or after `slot` (leaders skip slots now and then). */
async function produced(slot: number): Promise<{ slot: number; time: number } | null> {
  for (let s = slot; s < slot + 40; s++) {
    const t = await blockTime(s);
    if (t != null) return { slot: s, time: t };
  }
  return null;
}

/**
 * The seed block for a draw: the first finalized block whose timestamp is at least SEED_DELAY_S after the close.
 * It's fixed by the chain, not by when the cron happens to run — so nobody can time the trigger to pick a winner,
 * and anyone can find the same block again.
 */
export async function seedBlock(closeMs: number): Promise<{ slot: number; blockhash: string }> {
  const target = Math.floor(closeMs / 1000) + SEED_DELAY_S;
  const now = Date.now() / 1000;
  if (now < target + 20) throw new Error("Too early: the seed block isn't finalized yet");

  const tip = await rpc<number>("getSlot", [{ commitment: "finalized" }]);
  // Slots are ~400ms; start well before the target and make sure we really are before it.
  let lo = Math.max(0, tip - Math.ceil((now - target) / 0.38) - 2_000);
  for (let i = 0; i < 6; i++) {
    const p = await produced(lo);
    if (p && p.time < target) break;
    lo = Math.max(0, lo - 20_000);
  }
  let hi = tip;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const p = await produced(mid);
    if (!p || p.slot >= hi) {
      hi = mid;
      continue;
    }
    if (p.time >= target) hi = p.slot;
    else lo = p.slot;
  }
  const found = await produced(hi);
  if (!found) throw new Error("Couldn't locate the seed block");
  const block = await rpc<{ blockhash: string }>("getBlock", [
    found.slot,
    { encoding: "json", transactionDetails: "none", rewards: false, maxSupportedTransactionVersion: 0, commitment: "finalized" },
  ]);
  return { slot: found.slot, blockhash: block.blockhash };
}
