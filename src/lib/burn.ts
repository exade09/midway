"use client";
import { Buffer } from "buffer";
import { ComputeBudgetProgram, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createBurnCheckedInstruction, createCloseAccountInstruction } from "@solana/spl-token";
import { CLIENT_RPC_PATH, MEMO_PROGRAM, MEMO_TAG, POT_CUT_BPS, POT_WALLET } from "./config";
import { epochOf } from "./epoch";
import type { Bag } from "./types";

const PER_TX = 7;

async function call<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(CLIENT_RPC_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await res.json()) as { result?: T; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.result as T;
}

/** The pot's slice of reclaimed rent. `preview` shows it even before a pot wallet is configured (demo lot). */
export function potCut(rentLamports: number, preview = false) {
  return POT_WALLET || preview ? Math.floor((rentLamports * POT_CUT_BPS) / 10_000) : 0;
}

/** One transaction per ≤7 bags: burn what's left, close the account, rent comes home, a slice goes to the pot. */
export async function buildBurns(bags: Bag[], owner: PublicKey): Promise<Transaction[]> {
  const { value } = await call<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  const epoch = epochOf();
  const txs: Transaction[] = [];
  for (let i = 0; i < bags.length; i += PER_TX) {
    const group = bags.slice(i, i + PER_TX);
    const tx = new Transaction({ feePayer: owner, blockhash: value.blockhash, lastValidBlockHeight: value.lastValidBlockHeight });
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 + group.length * 12_000 }));
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }));
    tx.add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM),
        keys: [{ pubkey: owner, isSigner: true, isWritable: false }],
        data: Buffer.from(`${MEMO_TAG}|e${epoch}|${group.length}`),
      }),
    );
    for (const b of group) {
      const acc = new PublicKey(b.account);
      const prog = new PublicKey(b.program);
      if (b.amountRaw !== "0") tx.add(createBurnCheckedInstruction(acc, new PublicKey(b.mint), owner, BigInt(b.amountRaw), b.decimals, [], prog));
      tx.add(createCloseAccountInstruction(acc, owner, owner, [], prog));
    }
    const cut = potCut(group.reduce((t, b) => t + b.rentLamports, 0));
    if (cut > 0) tx.add(SystemProgram.transfer({ fromPubkey: owner, toPubkey: new PublicKey(POT_WALLET), lamports: cut }));
    txs.push(tx);
  }
  return txs;
}

export async function sendAndConfirm(tx: Transaction, onStage?: (s: "sent" | "confirmed") => void): Promise<string> {
  const raw = tx.serialize().toString("base64");
  const sig = await call<string>("sendTransaction", [raw, { encoding: "base64", skipPreflight: false, maxRetries: 3 }]);
  onStage?.("sent");
  const started = Date.now();
  while (Date.now() - started < 75_000) {
    await new Promise((r) => setTimeout(r, 1200));
    const { value } = await call<{ value: ({ confirmationStatus?: string; err: unknown } | null)[] }>("getSignatureStatuses", [[sig]]);
    const st = value[0];
    if (st?.err) throw new Error("Transaction failed on chain");
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
      onStage?.("confirmed");
      return sig;
    }
  }
  throw new Error("Timed out waiting for confirmation");
}
