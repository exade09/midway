import "server-only";
import { rpc } from "./rpc";
import { markets, solUsd, unknownMarket } from "./market";
import { classify, isBurnable, type RawAccount } from "./classify";
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./config";
import type { ScanResult } from "./types";

type Parsed = {
  pubkey: string;
  account: {
    lamports: number;
    data: {
      parsed: {
        info: {
          mint: string;
          state: "initialized" | "frozen";
          tokenAmount: { amount: string; decimals: number; uiAmount: number | null };
          extensions?: { extension: string; state?: { withheldAmount?: number } }[];
        };
      };
    };
  };
};

async function accounts(owner: string, program: string): Promise<RawAccount[]> {
  const res = await rpc<{ value: Parsed[] }>("getTokenAccountsByOwner", [
    owner,
    { programId: program },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  return res.value.map(({ pubkey, account }) => {
    const i = account.data.parsed.info;
    const fee = i.extensions?.find((e) => e.extension === "transferFeeAmount");
    return {
      account: pubkey,
      mint: i.mint,
      program,
      amountRaw: i.tokenAmount.amount,
      decimals: i.tokenAmount.decimals,
      uiAmount: i.tokenAmount.uiAmount ?? 0,
      rentLamports: account.lamports,
      state: i.state,
      withheld: (fee?.state?.withheldAmount ?? 0) > 0,
    };
  });
}

export async function scanWallet(owner: string): Promise<ScanResult> {
  const [classic, t22, sol] = await Promise.all([
    accounts(owner, TOKEN_PROGRAM),
    accounts(owner, TOKEN_2022_PROGRAM),
    solUsd(),
  ]);
  // Held NFTs (0 decimals, non-zero balance) are out of scope: we never want to burn art by accident.
  const raw = [...classic, ...t22].filter((a) => !(a.decimals === 0 && a.amountRaw !== "0"));
  const mk = await markets(raw.filter((a) => a.amountRaw !== "0").map((a) => a.mint));

  const bags = raw.map((a) => classify(a, mk.get(a.mint) ?? unknownMarket(a.mint), owner));
  const order = { RUGGED: 0, DUST: 1, EMPTY: 2, ALIVE: 3, FROZEN: 4, STUCK: 5, PROTECTED: 6 } as const;
  bags.sort(
    (x, y) =>
      order[x.status] - order[y.status] ||
      (y.death?.score ?? 0) - (x.death?.score ?? 0) ||
      (y.valueUsd ?? 0) - (x.valueUsd ?? 0),
  );

  const burnable = bags.filter(isBurnable);
  return {
    owner,
    scannedAt: new Date().toISOString(),
    solUsd: sol,
    bags,
    totals: {
      burnable: burnable.length,
      rentLamports: burnable.reduce((t, b) => t + b.rentLamports, 0),
      deathwatch: bags.filter((b) => b.status === "ALIVE").length,
    },
  };
}
