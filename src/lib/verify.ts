import "server-only";
import { rpc } from "./rpc";
import { MEMO_PROGRAM, MEMO_TAG, POT_CUT_BPS, POT_WALLET } from "./config";

type Ix = { program?: string; programId: string; parsed?: { type: string; info: Record<string, unknown> } | string };
type Tx = {
  blockTime: number | null;
  slot: number;
  meta: {
    err: unknown;
    preBalances: number[];
    preTokenBalances?: { accountIndex: number; mint: string }[];
  } | null;
  transaction: {
    message: { accountKeys: { pubkey: string; signer: boolean }[]; instructions: Ix[] };
  };
};

export interface VerifiedBurn {
  sig: string;
  blockTime: number;
  reclaimedLamports: number;
  potLamports: number;
  closed: { account: string; mint: string; burnedRaw: string; rentLamports: number }[];
}

/** Re-reads a Midway burn from chain and returns only what the chain proves. */
export async function verifyBurn(sig: string, owner: string): Promise<VerifiedBurn> {
  const tx = await rpc<Tx | null>("getTransaction", [
    sig,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
  ]);
  if (!tx || !tx.meta) throw new Error(`${sig.slice(0, 8)}… not found yet`);
  if (tx.meta.err) throw new Error(`${sig.slice(0, 8)}… failed on chain`);
  const keys = tx.transaction.message.accountKeys;
  if (keys[0]?.pubkey !== owner || !keys[0].signer) throw new Error("Transaction wasn't signed by this wallet");
  if (!tx.blockTime || Date.now() / 1000 - tx.blockTime > 86_400) throw new Error("Burn is older than a day");

  const ixs = tx.transaction.message.instructions;
  const memo = ixs.find((i) => i.programId === MEMO_PROGRAM);
  if (!memo || typeof memo.parsed !== "string" || !memo.parsed.startsWith(MEMO_TAG)) throw new Error("Not a Midway burn");

  const mintOf = new Map<string, string>();
  for (const b of tx.meta.preTokenBalances ?? []) mintOf.set(keys[b.accountIndex].pubkey, b.mint);

  const burned = new Map<string, string>();
  const closed: VerifiedBurn["closed"] = [];
  let pot = 0;
  for (const i of ixs) {
    if (typeof i.parsed !== "object" || !i.parsed) continue;
    const { type, info } = i.parsed;
    if (i.program === "spl-token" || i.program === "spl-token-2022") {
      if ((type === "burn" || type === "burnChecked") && info.authority === owner) {
        const amt = (info.amount as string) ?? (info.tokenAmount as { amount: string })?.amount ?? "0";
        burned.set(info.account as string, amt);
      }
      if (type === "closeAccount" && info.owner === owner && info.destination === owner) {
        const acc = info.account as string;
        const idx = keys.findIndex((k) => k.pubkey === acc);
        closed.push({ account: acc, mint: mintOf.get(acc) ?? "", burnedRaw: "0", rentLamports: idx >= 0 ? tx.meta.preBalances[idx] : 0 });
      }
    }
    if (i.program === "system" && type === "transfer" && info.source === owner && info.destination === POT_WALLET) {
      pot += Number(info.lamports);
    }
  }
  for (const c of closed) c.burnedRaw = burned.get(c.account) ?? "0";

  const reclaimed = closed.reduce((t, c) => t + c.rentLamports, 0);
  if (POT_WALLET) {
    const owed = Math.floor((reclaimed * POT_CUT_BPS) / 10_000);
    if (pot + 1 < owed) throw new Error("Pot cut missing from the burn");
  }
  return { sig, blockTime: tx.blockTime, reclaimedLamports: reclaimed, potLamports: pot, closed };
}
